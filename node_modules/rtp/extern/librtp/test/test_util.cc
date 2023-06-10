#include <gtest/gtest.h>

#include "util.h"

TEST(Util, U32) {
    uint8_t buffer[4];

    for(int i = 0; i < 10000; ++i) {
        uint32_t value = rand();
        write_u32(buffer, value);

        uint32_t result = read_u32(buffer);
        EXPECT_EQ(value, result);
    }
}

TEST(Util, U24) {
    uint8_t buffer[3];

    for(int i = 0; i < 10000; ++i) {
        uint32_t value = (rand() & 0xffffff); // 24-bits
        write_u24(buffer, value);

        uint32_t result = read_u24(buffer);
        EXPECT_EQ(value, result);
    }
}

TEST(Util, S24) {
    uint8_t buffer[3];

    for(int i = 0; i < 10000; ++i) {
        int value = (rand() & 0xffffff) - 0x7fffff; // 24-bits
        write_s24(buffer, value);

        uint32_t result = read_s24(buffer);
        EXPECT_EQ(value, result);
    }
}