/**
 * @file rtcp_app.h
 * @brief RTCP application-defined packet.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 * @ingroup app
 */

/**
 * @defgroup app APP packet
 * @brief RTCP APP packet description.
 * @ingroup rtcp
 *
 * @see IETF RFC3550 "Application-Defined RTCP Packet" (§6.7)
 *
 * @verbatim
 *   0               1               2               3
 *   0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |V=2|P| subtype |     PT=204    |             length            |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                           SSRC/CSRC                           |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                          name (ASCII)                         |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                              data                           ...
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * @endverbatim
 */

#ifndef LIBRTP_RTCP_APP_H_
#define LIBRTP_RTCP_APP_H_

#include "rtcp_header.h"

#if defined(__cplusplus)
extern "C" {
#endif // __cplusplus

/**
 * @brief RTCP APP packet.
 */
typedef struct rtcp_app {
    rtcp_header header;     /**< RTCP header. */
    uint32_t ssrc;          /**< Source identifier. */
    uint32_t name;          /**< Packet name (ASCII). */
    size_t app_size;        /**< Size of the application data in bytes. */
    void *app_data;         /**< Application data. */
} rtcp_app;

/**
 * @brief Allocate a new APP packet.
 *
 * @return rtcp_app_packet*
 */
rtcp_app *rtcp_app_create(void);

/**
 * @brief Free an APP packet.
 *
 * @param [out] packet - packet to free.
 */
void rtcp_app_free(rtcp_app *packet);

/**
 * @brief Initialize an APP packet with default values.
 *
 * @param [out] packet - packet to initialize.
 * @param [in] subtype - packet subtype.
 */
void rtcp_app_init(rtcp_app *packet, uint8_t subtype);

/**
 * @brief Returns the APP packet size.
 *
 * @param [in] packet - packet to check.
 * @return packet size in bytes.
 */
size_t rtcp_app_size(const rtcp_app *packet);

/**
 * @brief Write an APP packet to a buffer.
 *
 * @param [in] packet - packet to serialize.
 * @param [out] buffer - buffer to write to.
 * @param [in] size - buffer size.
 * @return number of bytes written or -1 on failure.
 */
int rtcp_app_serialize(
    const rtcp_app *packet, uint8_t *buffer, size_t size);

/**
 * @brief Parse an APP packet from a buffer.
 *
 * @param [out] packet - empty packet to fill.
 * @param [in] buffer - buffer to parse.
 * @param [in] size - buffer size.
 * @return 0 on success.
 */
int rtcp_app_parse(rtcp_app *packet, const uint8_t *buffer, size_t size);

/**
 * @brief Set the application-dependent data.
 *
 * @param [out] packet - packet to set on.
 * @param [in] data - data to set.
 * @param [in] size - data size.
 * @return 0 on success.
 */
int rtcp_app_set_data(rtcp_app *packet, const void *data, size_t size);

/**
 * @brief Clear the application-dependent data.
 *
 * @param [out] packet - packet to clear on.
 */
void rtcp_app_clear_data(rtcp_app *packet);

#if defined(__cplusplus)
}
#endif // __cplusplus

#endif // LIBRTP_RTCP_APP_H_
