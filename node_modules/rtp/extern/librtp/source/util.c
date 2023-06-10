/**
 * @file util.c
 * @brief Utility helper functions.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 */

#include <string.h>

#include "util.h"

void write_u24(uint8_t *buffer, uint32_t value)
{
    buffer[0] = (value >> 16) & 0xff;
    buffer[1] = (value >> 8) & 0xff;
    buffer[2] = (value >> 0) & 0xff;
}

void write_s24(uint8_t *buffer, int32_t value)
{
    uint32_t u;
    memcpy(&u, &value, 4);
    write_u24(buffer, u);
}

void write_u32(uint8_t *buffer, uint32_t value)
{
    buffer[0] = (uint8_t)((value >> 24) & 0xff);
    buffer[1] = (uint8_t)((value >> 16) & 0xff);
    buffer[2] = (uint8_t)((value >> 8) & 0xff);
    buffer[3] = (uint8_t)((value >> 0) & 0xff);
}

uint32_t read_u24(const uint8_t *buffer)
{
    return ((uint32_t)buffer[0] << 16)
         | ((uint32_t)buffer[1] << 8)
         | ((uint32_t)buffer[2] << 0);
}

int32_t read_s24(const uint8_t *buffer)
{
    // Read in the two's complement representation
    const uint32_t u = read_u24(buffer);
    if(u < 0x800000)
        return (int32_t)u;

    return -1 * (int32_t)(((~u) & 0xffffff) + 1);
}

uint32_t read_u32(const uint8_t *buffer)
{
    return ((uint32_t)buffer[0] << 24)
         | ((uint32_t)buffer[1] << 16)
         | ((uint32_t)buffer[2] << 8)
         | ((uint32_t)buffer[3] << 0);
}

void write_u16(uint8_t *buffer, uint16_t value)
{
    buffer[0] = (uint8_t)((value >> 8) & 0xff);
    buffer[1] = (uint8_t)(value & 0xff);
}

uint16_t read_u16(const uint8_t *buffer)
{
    return (uint16_t)(((uint16_t)buffer[0] << 8) | buffer[1]);
}
