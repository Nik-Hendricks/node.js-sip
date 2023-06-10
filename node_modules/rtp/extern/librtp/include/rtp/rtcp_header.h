/**
 * @file rtcp_header.h
 * @brief RTCP header.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 * @ingroup rtcp
 */

#ifndef LIBRTP_RTCP_HEADER_H_
#define LIBRTP_RTCP_HEADER_H_

#include <stdint.h>
#include <stddef.h>

#if defined(__cplusplus)
extern "C" {
#endif // __cplusplus

/**
 * @brief RTCP header.
 */
typedef union rtcp_header {
    /** Header format used by most packets. */
    struct {
        unsigned int version : 2;   /**< Protocol version. */
        unsigned int p : 1;         /**< Padding flag. */
        unsigned int count : 5;     /**< Varies by packet type */
        unsigned int pt : 8;        /**< RTCP packet type */
        uint16_t length;            /**< Length in 32-bit units (less 1) */
    } common;

    /** Header format used by the APP packet. */
    struct {
        unsigned int version : 2;   /**< Protocol version. */
        unsigned int p : 1;         /**< Padding flag. */
        unsigned int subtype : 5;   /**< App sub-type. */
        unsigned int pt : 8;        /**< RTCP packet type. */
        uint16_t length;            /**< Length in 32-bit units (less 1) */
    } app;
} rtcp_header;

/**
 * @brief RTCP packet types.
 */
typedef enum {
    RTCP_SR   = 200,
    RTCP_RR   = 201,
    RTCP_SDES = 202,
    RTCP_BYE  = 203,
    RTCP_APP  = 204
} rtcp_packet_type;

/**
 * @brief Write a RTCP header to a buffer.
 *
 * @param [in] header - header to serialize.
 * @param [out] buffer - buffer to write to.
 * @param [in] size - buffer size.
 * @return number of bytes written or -1 on failure.
 */
int rtcp_header_serialize(
    const rtcp_header *header, uint8_t *buffer, size_t size);

/**
 * @brief Parse an RTCP header from a buffer.
 *
 * @param [out] header - empty header to fill.
 * @param [in] buffer - buffer to parse.
 * @param [in] size - buffer size.
 * @return 0 on success.
 */
int rtcp_header_parse(
    rtcp_header *header, const uint8_t *buffer, size_t size);

#if defined(__cplusplus)
}
#endif // __cplusplus

#endif // LIBRTP_RTCP_HEADER_H_
