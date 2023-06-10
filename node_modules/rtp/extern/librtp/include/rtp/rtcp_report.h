/**
 * @file rtcp_report.h
 * @brief RTCP SR/RR report block.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 * @ingroup rtcp
 */

#ifndef LIBRTP_RTCP_REPORT_H_
#define LIBRTP_RTCP_REPORT_H_

#include <stdint.h>
#include <stddef.h>

#include "ntp.h"
#include "rtp_source.h"

#if defined(__cplusplus)
extern "C" {
#endif // __cplusplus

/**
 * @brief RTCP SR/RR report.
 */
typedef struct rtcp_report {
    uint32_t ssrc;              /**< Source identifier. */
    unsigned int fraction : 8;  /**< Fraction lost since last SR/RR. */
    int lost : 24;              /**< Cumulative number of packets lost. */
    uint32_t last_seq;          /**< Highest sequence number received. */
    uint32_t jitter;            /**< Interarrival jitter. */
    uint32_t lsr;               /**< Last SR. */
    uint32_t dlsr;              /**< Delay since last SR. */
} rtcp_report;

/**
 * @brief Initialize a report.
 *
 * @param [out] report - report to initialize.
 * @param [in] s - source state information.
 * @param [in] tc - the current time.
 */
void rtcp_report_init(rtcp_report *report, rtp_source *s, ntp_tv tc);

/**
 * @brief Write a report to a buffer.
 *
 * @param [in] report - report to serialize.
 * @param [out] buffer - buffer to write to.
 * @param [in] size - buffer size.
 * @return number of bytes written or -1 on failure.
 */
int rtcp_report_serialize(
    const rtcp_report *report, uint8_t *buffer, size_t size);

/**
 * @brief Parse a report from a buffer.
 *
 * @param [out] report - empty report to fill.
 * @param [in] buffer - buffer to parse.
 * @param [in] size - buffer size.
 * @return 0 on success.
 */
int rtcp_report_parse(
    rtcp_report *report, const uint8_t *buffer, size_t size);

#if defined(__cplusplus)
}
#endif // __cplusplus

#endif // LIBRTP_RTCP_REPORT_H_
