/**
 * @file rtcp_header.c
 * @brief RTCP header.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 */

#include <string.h>
#include <assert.h>

#include "rtp/rtcp_header.h"
#include "util.h"

int rtcp_header_serialize(
    const rtcp_header *header, uint8_t *buffer, size_t size)
{
    assert(header != NULL);
    assert(buffer != NULL);

    if(size < 4)
        return -1;

    buffer[0] = (uint8_t)((header->common.version << 6)
        | (header->common.p << 5)
        | (header->common.count));

    buffer[1] = header->common.pt;
    write_u16(buffer + 2, header->common.length);

    return 4;
}

int rtcp_header_parse(rtcp_header *header, const uint8_t *buffer, size_t size)
{
    assert(header != NULL);
    assert(buffer != NULL);

    if(size < 4)
        return -1;

    header->common.version = (unsigned)((buffer[0] >> 6) & 0x3);
    header->common.p = (unsigned)((buffer[0] >> 5) & 0x1);
    header->common.count = (unsigned)(buffer[0] & 0x1f);
    header->common.pt = buffer[1];
    header->common.length = read_u16(buffer + 2);

    if(header->common.version != 2)
        return -1;

    return header->common.pt;
}