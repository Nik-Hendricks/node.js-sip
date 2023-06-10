#include <gtest/gtest.h>

#include "rtp/rtcp_report.h"

TEST(Report, Size) {
    EXPECT_EQ(sizeof(rtcp_report), 24);
}

TEST(Report, Serialize) {
    rtcp_report report;

    report.ssrc = rand();
    report.fraction = rand() & 0xff;
    report.lost = (rand() & 0xffffff) - 0x7fffff;
    report.last_seq = rand();
    report.jitter = rand();
    report.lsr = rand();
    report.dlsr = rand();

    const size_t size = sizeof(rtcp_report);
    uint8_t *buffer = new uint8_t[size];

    EXPECT_DEATH(rtcp_report_serialize(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_report_serialize(&report, nullptr, 0), "");
    EXPECT_EQ(rtcp_report_serialize(&report, buffer, size), size);

    delete[] buffer;
}

TEST(Report, Parse) {
    rtcp_report report;

    report.ssrc = rand();
    report.fraction = rand() & 0xff;
    report.lost = (rand() & 0xffffff) - 0x7fffff;
    report.last_seq = rand();
    report.jitter = rand();
    report.lsr = rand();
    report.dlsr = rand();

    const size_t size = sizeof(rtcp_report);
    uint8_t *buffer = new uint8_t[size];

    rtcp_report_serialize(&report, buffer, size);

    rtcp_report parsed;
    EXPECT_DEATH(rtcp_report_parse(nullptr, buffer, size), "");
    EXPECT_DEATH(rtcp_report_parse(&parsed, nullptr, 0), "");
    EXPECT_EQ(rtcp_report_parse(&parsed, buffer, size), 0);

    EXPECT_EQ(report.ssrc, parsed.ssrc);
    EXPECT_EQ(report.fraction, parsed.fraction);
    EXPECT_EQ(report.lost, parsed.lost);
    EXPECT_EQ(report.last_seq, parsed.last_seq);
    EXPECT_EQ(report.jitter, parsed.jitter);
    EXPECT_EQ(report.lsr, parsed.lsr);
    EXPECT_EQ(report.dlsr, parsed.dlsr);

    delete[] buffer;
}
