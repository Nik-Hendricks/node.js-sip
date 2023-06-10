#include <gtest/gtest.h>
#include <chrono>

#include "rtp/ntp.h"

using namespace std::chrono;

TEST(NTP, Now) {
    auto tp = system_clock::now();
    double s = duration<double>(tp.time_since_epoch()).count();

    ntp_tv ntp = ntp_from_unix(s);
    EXPECT_DOUBLE_EQ(ntp_to_unix(ntp), s);
}

TEST(NTP, Seconds) {
    double s = 1641024000; // Jan 1, 2022

    ntp_tv ntp = ntp_from_unix(s);
    EXPECT_DOUBLE_EQ(ntp_to_unix(ntp), s);
}

TEST(NTP, Millis) {
    uint32_t millis = 12345;
    double s = millis / 1e3;

    ntp_tv ntp = ntp_from_unix(s);
    EXPECT_NEAR(ntp_to_unix(ntp), s, 1e-3);
}

TEST(NTP, Micros) {
    uint32_t micros = 12345;
    double s = micros / 1e6;

    ntp_tv ntp = ntp_from_unix(s);
    EXPECT_NEAR(ntp_to_unix(ntp), s, 1e-6);
}

TEST(NTP, Diff) {
    auto tp = system_clock::now();
    double s = duration<double>(tp.time_since_epoch()).count();

    ntp_tv ntp = ntp_from_unix(s);
    EXPECT_DOUBLE_EQ(ntp_to_unix(ntp), s);
}