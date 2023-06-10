#include <gtest/gtest.h>
#include <string>

#include "rtp/rtcp_sdes.h"

TEST(SdesPacket, Create) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    EXPECT_DEATH(rtcp_sdes_free(nullptr), "");
    rtcp_sdes_free(packet);
}

TEST(SdesPacket, AddChunk) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    EXPECT_DEATH(rtcp_sdes_add_entry(nullptr, 0x1234), "");
    EXPECT_NE(rtcp_sdes_add_entry(packet, 0x1234), -1);

    EXPECT_EQ(packet->header.common.count, 1);
    EXPECT_NE(packet->srcs, nullptr);

    rtcp_sdes_free(packet);
}

TEST(SdesPacket, FindChunk) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    EXPECT_EQ(rtcp_sdes_add_entry(packet, 0x1234), 0);

    EXPECT_DEATH(rtcp_sdes_find_entry(nullptr, 0x1234), "");
    EXPECT_EQ(rtcp_sdes_find_entry(packet, 0), -1);
    EXPECT_NE(rtcp_sdes_find_entry(packet, 0x1234), -1);

    rtcp_sdes_free(packet);
}

TEST(SdesPacket, RemoveChunk) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    rtcp_sdes_add_entry(packet, 0x1234);

    EXPECT_DEATH(rtcp_sdes_remove_entry(nullptr, 0x1234), "");
    rtcp_sdes_remove_entry(packet, 0x1234);

    EXPECT_EQ(packet->header.common.count, 0);
    EXPECT_EQ(packet->srcs, nullptr);

    rtcp_sdes_free(packet);
}

TEST(SdesPacket, Set) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    rtcp_sdes_add_entry(packet, 0x1234);

    const char data[] = "cname";
    EXPECT_DEATH(rtcp_sdes_set_item(nullptr, 0x1234, RTCP_SDES_CNAME, data), "");
    EXPECT_DEATH(rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_CNAME, nullptr), "");
    EXPECT_EQ(rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_CNAME, data), 0);

    EXPECT_EQ(packet->header.common.count, 1);
    EXPECT_NE(packet->srcs, nullptr);

    rtcp_sdes_entry *source = (rtcp_sdes_entry*)packet->srcs;
    EXPECT_EQ(source->id, 0x1234);
    EXPECT_EQ(source->item_count, 1);
    EXPECT_NE(source->items, nullptr);

    rtcp_sdes_item *item = (rtcp_sdes_item*)source->items;
    EXPECT_EQ(item->type, 1);
    EXPECT_EQ(item->length, strlen("cname"));
    EXPECT_NE(item->data, nullptr);

    rtcp_sdes_free(packet);
}

TEST(SdesPacket, Get) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    rtcp_sdes_add_entry(packet, 0x1234);

    const char data[] = "cname";
    rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_CNAME, data);

    char buffer[6];
    EXPECT_DEATH(rtcp_sdes_get_item(nullptr, 0x1234, RTCP_SDES_CNAME, buffer, sizeof(buffer)), "");
    EXPECT_DEATH(rtcp_sdes_get_item(packet, 0x1234, RTCP_SDES_CNAME, nullptr, 0), "");
    EXPECT_EQ(rtcp_sdes_get_item(packet, 0x1234, RTCP_SDES_CNAME, buffer, sizeof(buffer)), strlen(data));
    EXPECT_EQ(std::string(buffer), data);

    rtcp_sdes_free(packet);
}

TEST(SdesPacket, Clear) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    rtcp_sdes_add_entry(packet, 0x1234);
    rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_CNAME, "cname");

    EXPECT_DEATH(rtcp_sdes_clear_item(nullptr, 0x1234, RTCP_SDES_CNAME), "");
    rtcp_sdes_clear_item(packet, 0x1234, RTCP_SDES_CNAME);

    const int index = rtcp_sdes_find_entry(packet, 0x1234);
    rtcp_sdes_entry *entry = &packet->srcs[index];

    EXPECT_EQ(entry->item_count, 0);
    EXPECT_EQ(entry->items, nullptr);

    rtcp_sdes_free(packet);
}

TEST(SdesPacket, Size) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    EXPECT_DEATH(rtcp_sdes_size(nullptr), "");
    EXPECT_EQ(rtcp_sdes_size(packet), 4);

    for(uint8_t i = 1; i < 0x20; ++i) {
        rtcp_sdes_add_entry(packet, i);

        for(uint8_t j = 1; j <= 8; ++j) {
            char data[128];
            snprintf(data, sizeof(data), "%d.%d.%d", i, j, rand());

            rtcp_sdes_set_item(packet, i, (rtcp_sdes_type)j, data);
            EXPECT_EQ(rtcp_sdes_size(packet) % 4, 0);

            const int length = (packet->header.common.length + 1) * 4;
            EXPECT_EQ(length, rtcp_sdes_size(packet));
        }
    }

    for(uint8_t i = 1; i < 0x20; ++i) {
        for(uint8_t j = 1; j <= 8; ++j) {
            rtcp_sdes_clear_item(packet, i, (rtcp_sdes_type)j);
            EXPECT_EQ(rtcp_sdes_size(packet) % 4, 0);

            const int length = (packet->header.common.length + 1) * 4;
            EXPECT_EQ(length, rtcp_sdes_size(packet));
        }

        rtcp_sdes_remove_entry(packet, i);
    }

    EXPECT_EQ(rtcp_sdes_size(packet), 4);

    rtcp_sdes_free(packet);
}

TEST(SdesPacket, Serialize) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    rtcp_sdes_add_entry(packet, 0x1234);
    rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_CNAME, "cname");
    rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_NAME, "name");
    rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_EMAIL, "email");

    const int size = rtcp_sdes_size(packet);
    uint8_t *buffer = new uint8_t[size];

    EXPECT_DEATH(rtcp_sdes_serialize(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_sdes_serialize(packet, nullptr, 0), "");
    EXPECT_EQ(rtcp_sdes_serialize(packet, buffer, size), size);

    rtcp_sdes_free(packet);
    delete[] buffer;
}

TEST(SdesPacket, Parse) {
    rtcp_sdes *packet = rtcp_sdes_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sdes_init(packet);

    rtcp_sdes_add_entry(packet, 0x1234);
    rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_CNAME, "cname-1");
    rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_NAME, "name-1");
    rtcp_sdes_set_item(packet, 0x1234, RTCP_SDES_EMAIL, "email-1");

    rtcp_sdes_add_entry(packet, 0x5678);
    rtcp_sdes_set_item(packet, 0x5678, RTCP_SDES_CNAME, "cname-2");
    rtcp_sdes_set_item(packet, 0x5678, RTCP_SDES_NAME, "name-2");
    rtcp_sdes_set_item(packet, 0x5678, RTCP_SDES_EMAIL, "email-2");

    const int size = rtcp_sdes_size(packet);
    uint8_t *buffer = new uint8_t[size];

    rtcp_sdes_serialize(packet, buffer, size);

    rtcp_sdes *parsed = rtcp_sdes_create();
    EXPECT_DEATH(rtcp_sdes_parse(parsed, nullptr, 0), "");
    EXPECT_DEATH(rtcp_sdes_parse(nullptr, buffer, size), "");
    EXPECT_EQ(rtcp_sdes_parse(parsed, buffer, size), 0);

    char cname[8];
    rtcp_sdes_get_item(parsed, 0x1234, RTCP_SDES_CNAME, cname, sizeof(cname));
    EXPECT_EQ(std::string(cname), "cname-1");
    rtcp_sdes_get_item(parsed, 0x5678, RTCP_SDES_CNAME, cname, sizeof(cname));
    EXPECT_EQ(std::string(cname), "cname-2");

    char name[7];
    rtcp_sdes_get_item(parsed, 0x1234, RTCP_SDES_NAME, name, sizeof(name));
    EXPECT_EQ(std::string(name), "name-1");
    rtcp_sdes_get_item(parsed, 0x5678, RTCP_SDES_NAME, name, sizeof(name));
    EXPECT_EQ(std::string(name), "name-2");

    char email[8];
    rtcp_sdes_get_item(parsed, 0x1234, RTCP_SDES_EMAIL, email, sizeof(email));
    EXPECT_EQ(std::string(email), "email-1");
    rtcp_sdes_get_item(parsed, 0x5678, RTCP_SDES_EMAIL, email, sizeof(email));
    EXPECT_EQ(std::string(email), "email-2");

    rtcp_sdes_free(parsed);
    rtcp_sdes_free(packet);
    delete[] buffer;
}