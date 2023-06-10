#include <gtest/gtest.h>
#include <string>

#include "rtp/rtcp_bye.h"

TEST(ByePacket, Create) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    EXPECT_DEATH(rtcp_bye_free(nullptr), "");
    rtcp_bye_free(packet);
}

TEST(ByePacket, AddSource) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    rtcp_bye_init(packet);

    EXPECT_DEATH(rtcp_bye_add_source(nullptr, 0x1234), "");
    EXPECT_EQ(rtcp_bye_add_source(packet, 0x1234), 0);

    EXPECT_EQ(packet->header.common.count, 1);
    EXPECT_NE(packet->src_ids, nullptr);

    rtcp_bye_free(packet);
}

TEST(ByePacket, FindSource) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    rtcp_bye_init(packet);

    rtcp_bye_add_source(packet, 0x1234);

    EXPECT_DEATH(rtcp_bye_find_source(nullptr, 0x1234), "");
    EXPECT_EQ(rtcp_bye_find_source(packet, 0), -1);
    EXPECT_NE(rtcp_bye_find_source(packet, 0x1234), -1);

    rtcp_bye_free(packet);
}

TEST(ByePacket, RemoveSource) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    rtcp_bye_init(packet);

    rtcp_bye_add_source(packet, 0x1234);

    EXPECT_DEATH(rtcp_bye_remove_source(nullptr, 0x1234), "");
    rtcp_bye_remove_source(packet, 0x1234);

    EXPECT_EQ(packet->header.common.count, 0);
    EXPECT_EQ(packet->src_ids, nullptr);

    rtcp_bye_free(packet);
}

TEST(ByePacket, Set) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    rtcp_bye_init(packet);

    EXPECT_DEATH(rtcp_bye_set_message(nullptr, "hello"), "");
    EXPECT_DEATH(rtcp_bye_set_message(packet, nullptr), "");
    EXPECT_NE(rtcp_bye_set_message(packet, "hello"), -1);

    rtcp_bye_free(packet);
}

TEST(ByePacket, Clear) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    rtcp_bye_init(packet);

    const char data[] = "hello";
    rtcp_bye_set_message(packet, data);

    EXPECT_DEATH(rtcp_bye_clear_message(nullptr), "");
    rtcp_bye_clear_message(packet);

    EXPECT_EQ(packet->message, nullptr);

    rtcp_bye_free(packet);
}

TEST(ByePacket, Size) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    rtcp_bye_init(packet);

    EXPECT_DEATH(rtcp_bye_size(nullptr), "");
    EXPECT_EQ(rtcp_bye_size(packet), 4);
    EXPECT_EQ(packet->header.common.length, 0);

    for(uint8_t i = 1; i < 0xff; ++i) {
        char message[64];
        const int size = snprintf(message, sizeof(message), "%d", rand());
        rtcp_bye_set_message(packet, message);
        EXPECT_EQ(rtcp_bye_size(packet) % 4, 0);

        const int length = (packet->header.common.length + 1) * 4;
        EXPECT_EQ(length, rtcp_bye_size(packet));
    }

    rtcp_bye_clear_message(packet);
    EXPECT_EQ(rtcp_bye_size(packet), 4);
    EXPECT_EQ(packet->header.common.length, 0);

    rtcp_bye_free(packet);
}

TEST(ByePacket, Serialize) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    rtcp_bye_init(packet);

    const char message[] = "test message";
    rtcp_bye_set_message(packet, message);

    const int size = rtcp_bye_size(packet);
    uint8_t *buffer = new uint8_t[size];

    EXPECT_DEATH(rtcp_bye_serialize(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_bye_serialize(packet, nullptr, 0), "");
    EXPECT_EQ(rtcp_bye_serialize(packet, buffer, size), size);

    rtcp_bye_free(packet);
    delete[] buffer;
}

TEST(ByePacket, Parse) {
    rtcp_bye *packet = rtcp_bye_create();
    EXPECT_NE(packet, nullptr);

    rtcp_bye_init(packet);

    const char message[] = "test message";
    rtcp_bye_set_message(packet, message);

    const int size = rtcp_bye_size(packet);
    uint8_t *buffer = new uint8_t[size];

    rtcp_bye_serialize(packet, buffer, size);

    rtcp_bye *parsed = rtcp_bye_create();
    EXPECT_DEATH(rtcp_bye_parse(parsed, nullptr, 0), "");
    EXPECT_DEATH(rtcp_bye_parse(nullptr, buffer, size), "");
    EXPECT_EQ(rtcp_bye_parse(parsed, buffer, size), 0);

    // Check data
    EXPECT_EQ(std::string(parsed->message), std::string(packet->message));

    rtcp_bye_free(parsed);
    rtcp_bye_free(packet);
    delete[] buffer;
}