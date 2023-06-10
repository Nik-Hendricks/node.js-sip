/**
 * @file rtcp_sr.h
 * @brief RTCP sender report packet.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 * @ingroup sr
 */

/**
 * @defgroup sr SR packet
 * @brief RTCP SR packet description.
 * @ingroup rtcp
 *
 * @see IETF RFC3550 "Sender Report RTCP Packet" (§6.4.1)
 *
 * @verbatim
 *   0               1               2               3
 *   0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |V=2|P|   SC    |     PT=200    |             length            |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                         SSRC of sender                        |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                          NTP timestamp                        |
 *  |                                                               |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                          RTP timestamp                        |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                      sender's packet count                    |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                      sender's octet count                     |
 *  +=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
 *  |                      SSRC of first source                     |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  | fraction lost |        cumulative number of packets lost      |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |           extended highest sequence number received           |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                       interarrival jitter                     |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                          last SR (LSR)                        |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                   delay since last SR (DLSR)                  |
 *  +=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
 *  |                      SSRC of second source                    |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  :                              ...                              :
 *  +=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
 *  |                   profile-specific extensions                 |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * @endverbatim
 */

#ifndef LIBRTP_RTCP_SR_H_
#define LIBRTP_RTCP_SR_H_

#include "rtcp_header.h"
#include "rtcp_report.h"

#if defined(__cplusplus)
extern "C" {
#endif // __cplusplus

/**
 * @brief RTCP SR packet.
 */
typedef struct rtcp_sr {
    rtcp_header header;         /**< RTCP header. */
    uint32_t ssrc;              /**< Source identifier. */
    uint32_t ntp_sec;           /**< NTP timestamp MSW. */
    uint32_t ntp_frac;          /**< NTP timestamp LSW. */
    uint32_t rtp_ts;            /**< RTP timestamp. */
    uint32_t pkt_count;         /**< Sender's packet count. */
    uint32_t byte_count;        /**< Sender's byte count. */
    rtcp_report *reports;       /**< Reports. */
    size_t ext_size;            /**< Size of the extension data in bytes. */
    void *ext_data;             /**< Extension data. */
} rtcp_sr;

/**
 * @brief Allocate a new SR packet.
 *
 * @return rtcp_sr*
 */
rtcp_sr *rtcp_sr_create(void);

/**
 * @brief Free an SR packet.
 *
 * @param [out] packet - packet to free.
 */
void rtcp_sr_free(rtcp_sr *packet);

/**
 * @brief Initialize an SR packet with default values.
 *
 * @param [out] packet - packet to initialize.
 */
void rtcp_sr_init(rtcp_sr *packet);

/**
 * @brief Returns the SR packet size.
 *
 * @param [in] packet - packet to check.
 * @return packet size in bytes.
 */
size_t rtcp_sr_size(const rtcp_sr *packet);

/**
 * @brief Write an SR packet to a buffer.
 *
 * @param [in] packet - packet to serialize.
 * @param [out] buffer - buffer to write to.
 * @param [in] size - buffer size.
 * @return number of bytes written or -1 on failure.
 */
int rtcp_sr_serialize(const rtcp_sr *packet, uint8_t *buffer, size_t size);

/**
 * @brief Parse an RR packet from a buffer.
 *
 * @param [out] packet - empty packet to fill.
 * @param [in] buffer - buffer to parse.
 * @param [in] size - buffer size.
 * @return 0 on success
 */
int rtcp_sr_parse(rtcp_sr *packet, const uint8_t *buffer, size_t size);

/**
 * @brief Find a report.
 *
 * @param [in] packet - packet to search.
 * @param [in] ssrc - report source.
 * @return rtcp_report*
 */
rtcp_report *rtcp_sr_find_report(rtcp_sr *packet, uint32_t ssrc);

/**
 * @brief Add a report.
 *
 * @param [out] packet - packet to add to.
 * @param [in] report - report to add.
 * @return 0 on success.
 */
int rtcp_sr_add_report(rtcp_sr *packet, const rtcp_report *report);

/**
 * @brief Remove a report.
 *
 * @param [out] packet - packet to remove from.
 * @param [in] ssrc - source id of the report to remove.
 */
void rtcp_sr_remove_report(rtcp_sr *packet, uint32_t ssrc);

/**
 * @brief Set the extension data.
 *
 * @param [out] packet - packet to set on.
 * @param [in] data - data to set.
 * @param [in] size - data size.
 * @return 0 on success.
 */
int rtcp_sr_set_ext(rtcp_sr *packet, const void *data, size_t size);

/**
 * @brief Clear the extension data.
 *
 * @param [out] packet - packet to clear on.
 */
void rtcp_sr_clear_ext(rtcp_sr *packet);

#if defined(__cplusplus)
}
#endif // __cplusplus

#endif // LIBRTP_RTCP_SR_H_