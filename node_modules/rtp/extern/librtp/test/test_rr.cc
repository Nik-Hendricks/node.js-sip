#include <gtest/gtest.h>

#include "rtp/rtcp_rr.h"

TEST(RrPacket, Create) {
    rtcp_rr *packet = rtcp_rr_create();
    EXPECT_NE(packet, nullptr);

    EXPECT_DEATH(rtcp_rr_free(nullptr), "");
    rtcp_rr_free(packet);
}

TEST(RrPacket, Add) {
    rtcp_rr *packet = rtcp_rr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_rr_init(packet);

    rtcp_report report;
    EXPECT_DEATH(rtcp_rr_add_report(nullptr, &report), "");
    EXPECT_DEATH(rtcp_rr_add_report(packet, nullptr), "");
    EXPECT_EQ(rtcp_rr_add_report(packet, &report), 0);

    EXPECT_EQ(packet->header.common.count, 1);
    EXPECT_NE(packet->reports, nullptr);

    rtcp_rr_free(packet);
}

TEST(RrPacket, Find) {
    rtcp_rr *packet = rtcp_rr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_rr_init(packet);

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_rr_add_report(packet, &report);

    EXPECT_DEATH(rtcp_rr_find_report(nullptr, report.ssrc), "");
    EXPECT_EQ(rtcp_rr_find_report(packet, 0), nullptr);
    EXPECT_NE(rtcp_rr_find_report(packet, report.ssrc), nullptr);

    rtcp_rr_free(packet);
}

TEST(RrPacket, Remove) {
    rtcp_rr *packet = rtcp_rr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_rr_init(packet);

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_rr_add_report(packet, &report);

    EXPECT_DEATH(rtcp_rr_remove_report(nullptr, report.ssrc), "");
    rtcp_rr_remove_report(packet, report.ssrc);

    EXPECT_EQ(packet->header.common.count, 0);
    EXPECT_EQ(packet->reports, nullptr);

    rtcp_rr_free(packet);
}

TEST(RrPacket, Size) {
    rtcp_rr *packet = rtcp_rr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_rr_init(packet);

    EXPECT_DEATH(rtcp_rr_size(nullptr), "");
    EXPECT_EQ(rtcp_rr_size(packet), 8);
    EXPECT_EQ(packet->header.common.length, 1);

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_rr_add_report(packet, &report);

    EXPECT_DEATH(rtcp_rr_size(nullptr), "");
    EXPECT_EQ(rtcp_rr_size(packet), 8 + 24);
    EXPECT_EQ(packet->header.common.length, 1 + 6);

    rtcp_rr_free(packet);
}

TEST(RrPacket, Serialize) {
    rtcp_rr *packet = rtcp_rr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_rr_init(packet);

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_rr_add_report(packet, &report);

    const size_t size = rtcp_rr_size(packet);
    uint8_t *buffer = new uint8_t[size];

    EXPECT_DEATH(rtcp_rr_serialize(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_rr_serialize(packet, nullptr, 0), "");
    EXPECT_EQ(rtcp_rr_serialize(packet, buffer, size), size);

    rtcp_rr_free(packet);
    delete[] buffer;
}

TEST(RrPacket, Parse) {
    rtcp_rr *packet = rtcp_rr_create();
    EXPECT_NE(packet, nullptr);

    rtcp_rr_init(packet);

    packet->ssrc = rand();

    rtcp_report report = {
        .ssrc = 0x1234
    };

    rtcp_rr_add_report(packet, &report);

    uint32_t data = rand();
    rtcp_rr_set_ext(packet, &data, sizeof(data));

    const size_t size = rtcp_rr_size(packet);
    uint8_t *buffer = new uint8_t[size];

    rtcp_rr_serialize(packet, buffer, size);

    rtcp_rr *parsed = rtcp_rr_create();
    EXPECT_DEATH(rtcp_rr_parse(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_rr_parse(parsed, nullptr, 0), "");
    EXPECT_EQ(rtcp_rr_parse(parsed, buffer, size), 0);

    EXPECT_EQ(packet->ssrc, parsed->ssrc);
    EXPECT_EQ(packet->header.common.count, parsed->header.common.count);
    EXPECT_EQ(packet->ext_size, parsed->ext_size);

    EXPECT_NE(parsed->ext_data, nullptr);
    EXPECT_EQ(memcmp(packet->ext_data, parsed->ext_data, packet->ext_size), 0);

    rtcp_rr_free(parsed);
    rtcp_rr_free(packet);
    delete[] buffer;
}
