/**
 * @file rtcp_sdes.h
 * @brief RTCP source description packet.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 */

#include <stdlib.h>
#include <string.h>
#include <assert.h>

#include "rtp/rtcp_sdes.h"
#include "util.h"

/**
 * @brief Return a SDES item's size.
 *
 * @param [in] item - item to check.
 * @return item size in bytes or -1 on failure.
 * @private
 */
static size_t item_size(const rtcp_sdes_item *item)
{
    assert(item != NULL);

    return 2 + item->length;
}

/**
 * @brief Return a SDES entry's size.
 *
 * @param [in] source - source to check.
 * @return source size in bytes or -1 on failure.
 * @private
 */
static size_t entry_size(const rtcp_sdes_entry *source)
{
    assert(source != NULL);

    size_t size = 5; // SSRC + terminator

    for(uint8_t i = 0; i < source->item_count; ++i)
        size += item_size(&source->items[i]);

    // Entry must end on a 32-bit boundary
    if(size % 4)
        size += 4 - (size % 4);

    return size;
}

/**
 * @brief Find an item in a source entry.
 *
 * @param [in] source - source to search.
 * @param [in] type - item to find.
 * @return rtcp_sdes_item*
 * @private
 */
static rtcp_sdes_item *get_item(
    rtcp_sdes_entry *source, rtcp_sdes_type type)
{
    assert(source != NULL);

    for(uint8_t i = 0; i < source->item_count; ++i) {
        rtcp_sdes_item *item = &source->items[i];
        if(item->type == type)
            return item;
    }

    return NULL;
}

/**
 * @brief Add an item to a source entry.
 *
 * @param [out] source - source to add to.
 * @param [in] type - item type to add.
 * @param [in] data - item data.
 * @param [in] length - item length.
 * @return rtcp_sdes_item* - newly created item.
 * @private
 */
static rtcp_sdes_item *create_item(
    rtcp_sdes_entry *source,
    rtcp_sdes_type type,
    const void *data,
    uint8_t length)
{
    assert(source != NULL);
    assert(data != NULL);

    if(get_item(source, type))
        return NULL;

    if(source->item_count == 0) {
        source->items = (rtcp_sdes_item*)malloc(sizeof(rtcp_sdes_item));
        source->item_count = 1;
    }
    else {
        if(source->item_count == 0xff)
            return NULL;

        source->item_count += 1;

        const size_t nmemb = source->item_count * sizeof(rtcp_sdes_item);
        source->items = (rtcp_sdes_item*)realloc(source->items, nmemb);
    }

    rtcp_sdes_item *item = &source->items[source->item_count - 1];
    item->type = type;
    item->length = length;
    item->data = malloc(length);
    memcpy(item->data, data, length);

    return item;
}

/**
 * @brief Remove an item from a source entry.
 *
 * @param [out] source - source to remove from.
 * @param [in] type - item type to remove.
 * @private
 */
static void free_item(rtcp_sdes_entry *source, rtcp_sdes_type type)
{
    assert(source != NULL);

    rtcp_sdes_item *item = get_item(source, type);
    if(item == NULL)
        return;

    free(item->data);

    const ptrdiff_t offset = item - source->items;
    assert(offset >= 0);

    const size_t index = (size_t)offset / sizeof(rtcp_sdes_item);
    const size_t size = (source->item_count - index) * sizeof(rtcp_sdes_item);
    if(size)
        memmove(item, item + 1, size);

    source->item_count -= 1;
    if(source->item_count > 0) {
        const size_t nmemb = source->item_count * sizeof(rtcp_sdes_item);
        source->items = (rtcp_sdes_item*)realloc(source->items, nmemb);
    }
    else {
        free(source->items);
        source->items = NULL;
    }
}

/**
 * @brief Write a source entry to a buffer.
 *
 * @param [in] source - source to serialize.
 * @param [out] buffer - buffer to write to.
 * @param [in] size - buffer size.
 * @return number of bytes written or -1 on failure.
 * @private
 */
static int serialize_entry(
    const rtcp_sdes_entry *source, uint8_t *buffer, size_t size)
{
    assert(source != NULL);
    assert(buffer != NULL);

    const size_t source_size = entry_size(source);
    if(size < source_size)
        return -1;

    write_u32(buffer, source->id);

    size_t offset = 4;
    for(uint8_t i = 0; i < source->item_count; ++i) {
        rtcp_sdes_item *item = &source->items[i];
        buffer[offset++] = item->type;
        buffer[offset++] = item->length;
        memcpy(buffer + offset, item->data, item->length);
        offset += item->length;
    }

    while(offset < source_size)
        buffer[offset++] = '\0';

    return (int)source_size;
}

rtcp_sdes *rtcp_sdes_create()
{
    rtcp_sdes *packet = (rtcp_sdes*)malloc(sizeof(rtcp_sdes));
    if(packet)
        memset(packet, 0, sizeof(rtcp_sdes));

    return packet;
}

void rtcp_sdes_free(rtcp_sdes *packet)
{
    assert(packet != NULL);

    if(packet->srcs) {
        // Free sources
        for(uint8_t i = 0; i < packet->header.common.count; ++i) {
            rtcp_sdes_entry *source = &packet->srcs[i];

            // Free source items
            for(uint8_t j = 0; j < source->item_count; ++j) {
                rtcp_sdes_item *item = &source->items[j];
                if(item->data)
                    free(item->data);
            }

            free(source->items);
        }

        free(packet->srcs);
    }

    free(packet);
}

void rtcp_sdes_init(rtcp_sdes *packet)
{
    assert(packet != NULL);

    packet->header.common.version = 2;
    packet->header.common.pt = RTCP_SDES;
}

size_t rtcp_sdes_size(const rtcp_sdes *packet)
{
    assert(packet != NULL);

    size_t size = 4; // Header

    rtcp_sdes_entry *sources = (rtcp_sdes_entry*)packet->srcs;
    for(uint8_t i = 0; i < packet->header.common.count; ++i)
        size += entry_size(&sources[i]);

    return size;
}

int rtcp_sdes_serialize(
    const rtcp_sdes *packet, uint8_t *buffer, size_t size)
{
    assert(packet != NULL);
    assert(buffer != NULL);

    const size_t packet_size = rtcp_sdes_size(packet);
    if(size < packet_size)
        return -1;

    if(rtcp_header_serialize(&packet->header, buffer, size) < 0)
        return -1;

    size_t offset = 4;
    for(uint8_t i = 0; i < packet->header.common.count; ++i) {
        const int result = serialize_entry(
            &packet->srcs[i], buffer + offset, size - offset);

        if(result < 0)
            return -1;

        offset += (unsigned)result;
    }

    return (int)packet_size;
}

int rtcp_sdes_parse(
    rtcp_sdes *packet, const uint8_t *buffer, size_t size)
{
    assert(packet != NULL);
    assert(buffer != NULL);

    const int pt = rtcp_header_parse(&packet->header, buffer, size);
    if(pt != RTCP_SDES)
        return -1;

    // Parse sources
    if(packet->header.common.count) {
        packet->srcs = (rtcp_sdes_entry*)calloc(
            packet->header.common.count, sizeof(rtcp_sdes_entry));

        size_t offset = 4;
        for(uint8_t i = 0; i < packet->header.common.count; ++i) {
            // Initialize the source
            rtcp_sdes_entry *source = &packet->srcs[i];
            source->id = read_u32(buffer + offset);
            source->item_count = 0;
            source->items = NULL;
            offset += 4;

            // Navigate the list
            while(1) {
                const uint8_t *data = buffer + offset;
                const uint8_t type = data[0];
                if(type == 0) {
                    // End of list - move pointer to next 4 byte boundary
                    offset += 4 - (offset % 4);
                    break;
                }

                const uint8_t length = data[1];
                rtcp_sdes_item *item = create_item(
                    source, type, data + 2, length);

                if(!item)
                    return -1;

                offset += item_size(item);
            }
        }
    }

    return 0;
}

int rtcp_sdes_find_entry(rtcp_sdes *packet, uint32_t id)
{
    assert(packet != NULL);

    for(uint8_t i = 0; i < packet->header.common.count; ++i) {
        rtcp_sdes_entry *source = &packet->srcs[i];
        if(source->id == id)
            return i;
    }

    return -1;
}

int rtcp_sdes_add_entry(rtcp_sdes *packet, uint32_t id)
{
    assert(packet != NULL);

    if(!packet->header.common.count) {
        packet->srcs = (rtcp_sdes_entry*)malloc(sizeof(rtcp_sdes_entry));
        packet->header.common.count = 1;
    }
    else {
        if(packet->header.common.count == 0xff)
            return -1;

        if(rtcp_sdes_find_entry(packet, id) != -1)
            return -1;

        packet->header.common.count += 1;

        const size_t nmemb = packet->header.common.count * sizeof(rtcp_sdes_entry);
        packet->srcs = (rtcp_sdes_entry*)realloc(packet->srcs, nmemb);
    }

    rtcp_sdes_entry *source = &packet->srcs[packet->header.common.count - 1];
    source->id = id;
    source->item_count = 0;
    source->items = NULL;

    return 0;
}

void rtcp_sdes_remove_entry(rtcp_sdes *packet, uint32_t id)
{
    assert(packet != NULL);

    const int index = rtcp_sdes_find_entry(packet, id);
    if(index < 0)
        return;

    // Free the source's items
    rtcp_sdes_entry *source = &packet->srcs[index];
    for(uint8_t i = 0; i < source->item_count; ++i) {
        rtcp_sdes_item *item = &source->items[i];
        if(item->data)
            free(item->data);

        free(item);
    }

    const size_t size = (unsigned)(packet->header.common.count - index)
        * sizeof(rtcp_sdes_entry);

    if(size)
        memmove(source, source + 1, size);

    packet->header.common.count -= 1;
    if(packet->header.common.count > 0) {
        const size_t nmemb = packet->header.common.count * sizeof(rtcp_sdes_entry);
        packet->srcs = (rtcp_sdes_entry*)realloc(packet->srcs, nmemb);
    }
    else {
        free(packet->srcs);
        packet->srcs = NULL;
    }
}

int rtcp_sdes_get_item(
    rtcp_sdes *packet,
    uint32_t src,
    rtcp_sdes_type type,
    char *buffer,
    size_t size)
{
    assert(packet != NULL);
    assert(buffer != NULL);

    const int index = rtcp_sdes_find_entry(packet, src);
    if(index < 0)
        return -1;

    rtcp_sdes_entry *source = &packet->srcs[index];
    rtcp_sdes_item *item = get_item(source, type);
    if(size < (item->length + 1U))
        return -1;

    memcpy(buffer, item->data, item->length);
    buffer[item->length] = '\0';

    return item->length;
}

int rtcp_sdes_set_item(
    rtcp_sdes *packet, uint32_t src, rtcp_sdes_type type, const char *data)
{
    assert(packet != NULL);
    assert(data != NULL);

    const int index = rtcp_sdes_find_entry(packet, src);
    if(index < 0)
        return -1;

    rtcp_sdes_entry *source = &packet->srcs[index];
    if(get_item(source, type))
        free_item(source, type);

    size_t length = strlen(data);
    if(length > 0xFF)
        return -1;

    if(create_item(source, type, data, (uint8_t)length) == NULL)
        return -1;

    // Update header length
    packet->header.common.length = (uint16_t)((rtcp_sdes_size(packet) / 4) - 1);

    return 0;
}

void rtcp_sdes_clear_item(rtcp_sdes *packet, uint32_t src, rtcp_sdes_type type)
{
    assert(packet != NULL);

    const int index = rtcp_sdes_find_entry(packet, src);
    if(index < 0)
        return;

    rtcp_sdes_entry *source = &packet->srcs[index];
    free_item(source, type);

    // Update header length
    packet->header.common.length = (uint16_t)((rtcp_sdes_size(packet) / 4) - 1);
}
