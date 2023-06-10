#include <gtest/gtest.h>

#include "rtp/rtp_packet.h"

TEST(RtpPacket, Create) {
    rtp_packet *packet = rtp_packet_create();
    EXPECT_NE(packet, nullptr);

    EXPECT_DEATH(rtp_packet_free(nullptr), "");
    rtp_packet_free(packet);
}

TEST(RtpPacket, Set) {
    rtp_packet *packet = rtp_packet_create();
    EXPECT_NE(packet, nullptr);

    rtp_packet_init(packet, 96, rand(), rand(), rand());

    uint8_t data[32];
    EXPECT_DEATH(rtp_packet_set_payload(nullptr, data, sizeof(data)), "");
    EXPECT_DEATH(rtp_packet_set_payload(packet, nullptr, 0), "");
    EXPECT_EQ(rtp_packet_set_payload(packet, data, sizeof(data)), 0);

    rtp_packet_free(packet);
}

TEST(RtpPacket, Clear) {
    rtp_packet *packet = rtp_packet_create();
    EXPECT_NE(packet, nullptr);

    rtp_packet_init(packet, 96, rand(), rand(), rand());

    uint8_t data[32];
    rtp_packet_set_payload(packet, data, sizeof(data));

    EXPECT_DEATH(rtp_packet_clear_payload(nullptr), "");
    rtp_packet_clear_payload(packet);

    EXPECT_EQ(packet->payload_size, 0);
    EXPECT_EQ(packet->payload_data, nullptr);

    rtp_packet_free(packet);
}

TEST(RtpPacket, Serialize) {
    rtp_packet *packet = rtp_packet_create();
    EXPECT_NE(packet, nullptr);

    rtp_packet_init(packet, 96, rand(), rand(), rand());

    uint8_t data[32];
    rtp_packet_set_payload(packet, data, sizeof(data));

    const int size = rtp_packet_size(packet);
    uint8_t *buffer = new uint8_t[size];

    EXPECT_DEATH(rtp_packet_serialize(nullptr, buffer, size), "");
    EXPECT_DEATH(rtp_packet_serialize(packet, nullptr, 0), "");
    EXPECT_EQ(rtp_packet_serialize(packet, buffer, size), size);

    rtp_packet_free(packet);
    delete[] buffer;
}

TEST(RtpPacket, Parse) {
    rtp_packet *packet = rtp_packet_create();
    EXPECT_NE(packet, nullptr);

    rtp_packet_init(packet, 96, rand(), rand(), rand());

    char data[] = "payload string of arbitrary length";
    rtp_packet_set_payload(packet, data, sizeof(data));

    const int size = rtp_packet_size(packet);
    uint8_t *buffer = new uint8_t[size];

    rtp_packet_serialize(packet, buffer, size);

    rtp_packet *parsed = rtp_packet_create();
    EXPECT_DEATH(rtp_packet_parse(nullptr, buffer, size), "");
    EXPECT_DEATH(rtp_packet_parse(parsed, nullptr, 0), "");
    EXPECT_NE(rtp_packet_parse(parsed, buffer, size), -1);

    // Check data
    EXPECT_EQ(memcmp(packet->payload_data, parsed->payload_data, packet->payload_size), 0);

    rtp_packet_free(parsed);
    rtp_packet_free(packet);
    delete[] buffer;
}
