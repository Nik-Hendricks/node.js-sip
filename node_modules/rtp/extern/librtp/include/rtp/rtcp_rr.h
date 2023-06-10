/**
 * @file rtcp_rr.h
 * @brief RTCP receiver report packet.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 * @ingroup rr
 */

/**
 * @defgroup rr RR packet
 * @brief RTCP RR packet description.
 * @ingroup rtcp
 *
 * @see IETF RFC3550 "Receiver Report RTCP Packet" (§6.4.2)
 *
 * @verbatim
 *   0               1               2               3
 *   0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |V=2|P|   SC    |     PT=201    |             length            |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                         SSRC of sender                        |
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
 *  |                   profile-specific extensions               ...
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * @endverbatim
 */

#ifndef LIBRTP_RTCP_RR_H_
#define LIBRTP_RTCP_RR_H_

#include "rtcp_header.h"
#include "rtcp_report.h"

#if defined(__cplusplus)
extern "C" {
#endif // __cplusplus

/**
 * @brief RTCP RR packet.
 */
typedef struct rtcp_rr {
    rtcp_header header;     /**< RTCP header. */
    uint32_t ssrc;          /**< Source identifier. */
    rtcp_report *reports;   /**< Reports. */
    size_t ext_size;        /**< Size of the extension data in bytes. */
    void *ext_data;         /**< Extension data. */
} rtcp_rr;

/**
 * @brief Allocate a new RR packet.
 *
 * @return rtcp_rr*
 */
rtcp_rr *rtcp_rr_create(void);

/**
 * @brief Free an RR packet.
 *
 * @param [out] packet - packet to free.
 */
void rtcp_rr_free(rtcp_rr *packet);

/**
 * @brief Initialize an RR packet with default values.
 *
 * @param [out] packet - packet to initialize.
 */
void rtcp_rr_init(rtcp_rr *packet);

/**
 * @brief Returns the RR packet size.
 *
 * @param [in] packet - packet to check.
 * @return packet size in bytes.
 */
size_t rtcp_rr_size(const rtcp_rr *packet);

/**
 * @brief Write an RR packet to a buffer.
 *
 * @param [in] packet - packet to serialize.
 * @param [out] buffer - buffer to write to.
 * @param [in] size - buffer size.
 * @return number of bytes written or -1 on failure.
 */
int rtcp_rr_serialize(const rtcp_rr *packet, uint8_t *buffer, size_t size);

/**
 * @brief Parse an RR packet from a buffer.
 *
 * @param [out] packet - empty packet to fill.
 * @param [in] buffer - buffer to parse.
 * @param [in] size - buffer size.
 * @return 0 on success.
 */
int rtcp_rr_parse(rtcp_rr *packet, const uint8_t *buffer, size_t size);

/**
 * @brief Find a report.
 *
 * @param [in] packet - packet to search
 * @param [in] ssrc - report source.
 * @return rtcp_report*
 */
rtcp_report *rtcp_rr_find_report(rtcp_rr *packet, uint32_t ssrc);

/**
 * @brief Add a report.
 *
 * @param [out] packet - packet to add to.
 * @param [in] report - report to add.
 * @return 0 on success.
 */
int rtcp_rr_add_report(rtcp_rr *packet, const rtcp_report *report);

/**
 * @brief Remove a report.
 *
 * @param [out] packet - packet to remove from.
 * @param [in] ssrc - source id of the report to remove.
 */
void rtcp_rr_remove_report(rtcp_rr *packet, uint32_t ssrc);

/**
 * @brief Set extension data.
 *
 * @param [out] packet - packet to set on.
 * @param [in] data - data to set.
 * @param [in] size - data size.
 * @return 0 on success.
 */
int rtcp_rr_set_ext(rtcp_rr *packet, const void *data, size_t size);

/**
 * @brief Clear the extension data.
 *
 * @param [out] packet - packet to clear on.
 */
void rtcp_rr_clear_ext(rtcp_rr *packet);

#if defined(__cplusplus)
}
#endif // __cplusplus

#endif // LIBRTP_RTCP_RR_H_
