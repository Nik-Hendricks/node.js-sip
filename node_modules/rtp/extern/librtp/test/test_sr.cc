#include <gtest/gtest.h>

#include "rtp/rtcp_sr.h"

TEST(SrPacket, Create) {
    rtcp_sr *packet = rtcp_sr_create();
    EXPECT_NE(packet, nullptr);

    EXPECT_DEATH(rtcp_sr_free(nullptr), "");
    rtcp_sr_free(packet);
}

TEST(SrPacket, Add) {
    rtcp_sr *packet = rtcp_sr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sr_init(packet);

    rtcp_report report;
    EXPECT_DEATH(rtcp_sr_add_report(nullptr, &report), "");
    EXPECT_DEATH(rtcp_sr_add_report(packet, nullptr), "");
    EXPECT_EQ(rtcp_sr_add_report(packet, &report), 0);

    EXPECT_EQ(packet->header.common.count, 1);
    EXPECT_NE(packet->reports, nullptr);

    rtcp_sr_free(packet);
}

TEST(SrPacket, Find) {
    rtcp_sr *packet = rtcp_sr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sr_init(packet);

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_sr_add_report(packet, &report);

    EXPECT_DEATH(rtcp_sr_find_report(nullptr, report.ssrc), "");
    EXPECT_EQ(rtcp_sr_find_report(packet, 0), nullptr);
    EXPECT_NE(rtcp_sr_find_report(packet, report.ssrc), nullptr);

    rtcp_sr_free(packet);
}

TEST(SrPacket, Remove) {
    rtcp_sr *packet = rtcp_sr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sr_init(packet);

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_sr_add_report(packet, &report);

    EXPECT_DEATH(rtcp_sr_remove_report(nullptr, report.ssrc), "");
    rtcp_sr_remove_report(packet, report.ssrc);

    EXPECT_EQ(packet->header.common.count, 0);
    EXPECT_EQ(packet->reports, nullptr);

    rtcp_sr_free(packet);
}

TEST(SrPacket, Size) {
    rtcp_sr *packet = rtcp_sr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sr_init(packet);

    EXPECT_DEATH(rtcp_sr_size(nullptr), "");

    EXPECT_EQ(rtcp_sr_size(packet), 28);
    EXPECT_EQ(packet->header.common.length, 6);

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_sr_add_report(packet, &report);

    EXPECT_EQ(rtcp_sr_size(packet), 28 + 24);
    EXPECT_EQ(packet->header.common.length, 6 + 6);

    rtcp_sr_free(packet);
}

TEST(SrPacket, Serialize) {
    rtcp_sr *packet = rtcp_sr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sr_init(packet);

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_sr_add_report(packet, &report);

    const size_t size = rtcp_sr_size(packet);
    uint8_t *buffer = new uint8_t[size];

    EXPECT_DEATH(rtcp_sr_serialize(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_sr_serialize(packet, nullptr, 0), "");
    EXPECT_EQ(rtcp_sr_serialize(packet, buffer, size), size);

    rtcp_sr_free(packet);
    delete[] buffer;
}

TEST(SrPacket, Parse) {
    rtcp_sr *packet = rtcp_sr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_sr_init(packet);

    packet->ssrc = rand();
    packet->ntp_sec = rand();
    packet->ntp_frac = rand();
    packet->rtp_ts = rand();
    packet->pkt_count = rand();
    packet->byte_count = rand();

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_sr_add_report(packet, &report);

    uint32_t data = rand();
    rtcp_sr_set_ext(packet, &data, sizeof(data));

    const size_t size = rtcp_sr_size(packet);
    uint8_t *buffer = new uint8_t[size];

    rtcp_sr_serialize(packet, buffer, size);

    rtcp_sr *parsed = rtcp_sr_create();
    EXPECT_DEATH(rtcp_sr_parse(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_sr_parse(parsed, nullptr, 0), "");
    EXPECT_EQ(rtcp_sr_parse(parsed, buffer, size), 0);

    EXPECT_EQ(packet->ssrc, parsed->ssrc);
    EXPECT_EQ(packet->header.common.count, parsed->header.common.count);
    EXPECT_EQ(packet->ext_size, parsed->ext_size);

    EXPECT_NE(parsed->ext_data, nullptr);
    EXPECT_EQ(memcmp(packet->ext_data, parsed->ext_data, packet->ext_size), 0);

    rtcp_sr_free(parsed);
    rtcp_sr_free(packet);
    delete[] buffer;
}