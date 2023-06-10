#include <gtest/gtest.h>

#include "rtp/rtcp_app.h"

TEST(AppPacket, Create) {
    rtcp_app *packet = rtcp_app_create();
    EXPECT_NE(packet, nullptr);

    EXPECT_DEATH(rtcp_app_free(nullptr), "");
    rtcp_app_free(packet);
}

TEST(AppPacket, Set) {
    rtcp_app *packet = rtcp_app_create();
    EXPECT_NE(packet, nullptr);

    rtcp_app_init(packet, 0);

    uint8_t data[32];
    EXPECT_DEATH(rtcp_app_set_data(nullptr, data, sizeof(data)), "");
    EXPECT_DEATH(rtcp_app_set_data(packet, nullptr, 0), "");
    EXPECT_EQ(rtcp_app_set_data(packet, data, sizeof(data)), 0);

    rtcp_app_free(packet);
}

TEST(AppPacket, Clear) {
    rtcp_app *packet = rtcp_app_create();
    EXPECT_NE(packet, nullptr);

    rtcp_app_init(packet, 0);

    uint8_t data[32];
    rtcp_app_set_data(packet, data, sizeof(data));

    EXPECT_DEATH(rtcp_app_clear_data(nullptr), "");

    rtcp_app_clear_data(packet);
    EXPECT_EQ(packet->app_size, 0);
    EXPECT_EQ(packet->app_data, nullptr);

    rtcp_app_free(packet);
}

TEST(AppPacket, Size) {
    rtcp_app *packet = rtcp_app_create();
    EXPECT_NE(packet, nullptr);

    rtcp_app_init(packet, 0);

    EXPECT_DEATH(rtcp_app_size(nullptr), "");
    EXPECT_EQ(rtcp_app_size(packet), 12);
    EXPECT_EQ(packet->header.common.length, 2);

    for(uint8_t i = 1; i < 0xff; ++i) {
        char data[64];
        const int size = snprintf(data, sizeof(data), "%d", rand());
        rtcp_app_set_data(packet, data, size);
        EXPECT_EQ(rtcp_app_size(packet) % 4, 0);

        const int length = (packet->header.common.length + 1) * 4;
        EXPECT_EQ(length, rtcp_app_size(packet));
    }

    rtcp_app_clear_data(packet);
    EXPECT_EQ(rtcp_app_size(packet), 12);
    EXPECT_EQ(packet->header.common.length, 2);

    rtcp_app_free(packet);
}

TEST(AppPacket, Serialize) {
    rtcp_app *packet = rtcp_app_create();
    EXPECT_NE(packet, nullptr);

    rtcp_app_init(packet, 0);

    uint8_t data[32];
    rtcp_app_set_data(packet, data, sizeof(data));

    const int size = rtcp_app_size(packet);
    uint8_t *buffer = new uint8_t[size];

    EXPECT_DEATH(rtcp_app_serialize(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_app_serialize(packet, nullptr, 0), "");
    EXPECT_EQ(rtcp_app_serialize(packet, buffer, size), size);

    rtcp_app_free(packet);
    delete[] buffer;
}

TEST(AppPacket, Parse) {
    rtcp_app *packet = rtcp_app_create();
    EXPECT_NE(packet, nullptr);

    rtcp_app_init(packet, 0);

    uint8_t data[32];
    rtcp_app_set_data(packet, data, sizeof(data));

    const int size = rtcp_app_size(packet);
    uint8_t *buffer = new uint8_t[size];

    rtcp_app_serialize(packet, buffer, size);

    rtcp_app *parsed = rtcp_app_create();
    EXPECT_DEATH(rtcp_app_parse(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_app_parse(parsed, nullptr, 0), "");
    EXPECT_NE(rtcp_app_parse(parsed, buffer, size), -1);

    // Check data
    EXPECT_EQ(memcmp(packet->app_data, parsed->app_data, packet->app_size), 0);

    rtcp_app_free(parsed);
    rtcp_app_free(packet);
    delete[] buffer;
}
