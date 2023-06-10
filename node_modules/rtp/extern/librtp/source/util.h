/**
 * @file util.h
 * @brief Utility helper functions.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 */

#ifndef LIBRTP_UTIL_H_
#define LIBRTP_UTIL_H_

#include <stdint.h>

#if defined(__cplusplus)
extern "C" {
#endif // __cplusplus

/**
 * @brief Write a 24-bit value to a buffer (big-endian).
 *
 * @param [out] buffer - buffer to write to.
 * @param [in] value - value to write.
 * @private
 */
void write_u24(uint8_t *buffer, uint32_t value);

/**
 * @brief Write a signed 24-bit value to a buffer (big endian).
 *
 * @param [out] buffer - buffer to write to.
 * @param [in] value - value to write.
 * @private
 */
void write_s24(uint8_t *buffer, int32_t value);

/**
 * @brief Write a 32-bit value to a buffer (big-endian).
 *
 * @param [out] buffer - buffer to write to.
 * @param [in] value - value to write.
 * @private
 */
void write_u32(uint8_t *buffer, uint32_t value);

/**
 * @brief Read a 24-bit value from a buffer (big-endian).
 *
 * @param [in] buffer - buffer to read from.
 * @return uint32_t - value read.
 * @private
 */
uint32_t read_u24(const uint8_t *buffer);

/**
 * @brief Read a signed 24-bit value from a buffer (big-endian).
 *
 * @param [in] buffer - buffer to read from.
 * @return int32_t - value read.
 * @private
 */
int32_t read_s24(const uint8_t *buffer);

/**
 * @brief Read a 32-bit value from a buffer (big-endian).
 *
 * @param [in] buffer - buffer to read from.
 * @return uint32_t - value read.
 * @private
 */
uint32_t read_u32(const uint8_t *buffer);

/**
 * @brief Write a 16-bit value to a buffer (big-endian).
 *
 * @param [in] buffer - buffer to write to.
 * @param [in] value - value to write.
 * @private
 */
void write_u16(uint8_t *buffer, uint16_t value);

/**
 * @brief Read a 16-bit value from a buffer (big-endian).
 *
 * @param [in] buffer to read from.
 * @return uint16_t - value read.
 * @private
 */
uint16_t read_u16(const uint8_t *buffer);

#if defined(__cplusplus)
}
#endif // __cplusplus

#endif // LIBRTP_UTIL_H_
