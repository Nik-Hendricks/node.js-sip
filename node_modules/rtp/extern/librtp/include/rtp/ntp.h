/**
 * @file ntp.h
 * @brief NTP to Unix timestamp conversions.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 */

#ifndef LIBRTP_NTP_H_
#define LIBRTP_NTP_H_

#include <stdint.h>

#if defined(__cplusplus)
extern "C" {
#endif // __cplusplus

/**
 * @brief NTP timeval.
 */
typedef struct ntp_tv {
    uint32_t sec;       /**< Seconds since Jan 1, 1900. */
    uint32_t frac;      /**< Fractional seconds (2^32). */
} ntp_tv;

/**
 * @brief Converts an NTP timestamp to its double representation.
 *
 * @param ntp - NTP timestamp.
 * @return seconds since Jan 1, 1900.
 */
double ntp_to_double(ntp_tv ntp);

/**
 * @brief Converts an NTP timestamp to a Unix timestamp.
 *
 * @param [in] ntp - NTP timestamp.
 * @return seconds since Jan 1, 1970.
 */
double ntp_to_unix(ntp_tv ntp);

/**
 * @brief Converts a double to an NTP timestamp.
 *
 * @param s - seconds since Jan 1, 1900.
 * @return NTP timestamp.
 */
ntp_tv ntp_from_double(double s);

/**
 * @brief Converts a Unix timestamp to an NTP timestamp.
 *
 * @param [in] s - seconds since Jan 1, 1970.
 * @return NTP timestamp.
 */
ntp_tv ntp_from_unix(double s);

/**
 * @brief Convert an NTP timestamp to its short representation.
 *
 * @param [in] ntp - NTP timestamp.
 * @return NTP short format timestamp.
 */
uint32_t ntp_short(ntp_tv ntp);

/**
 * @brief Returns the difference between two NTP timestamps.
 *
 * @param [in] a - first timestamp.
 * @param [in] b - second timestamp.
 * @return ntp time difference (a - b).
 */
ntp_tv ntp_diff(ntp_tv a, ntp_tv b);

#if defined(__cplusplus)
}
#endif // __cplusplus

#endif // LIBRTP_NTP_H_
