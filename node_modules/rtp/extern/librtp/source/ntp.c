/**
 * @file ntp.h
 * @brief NTP to Unix timestamp conversions.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 */

#include "rtp/ntp.h"

/**
 * @brief 1970 - 1900 in seconds.
 * @private
 */
#define LIBRTP_NTP_UNIX_OFFSET (2208988800UL)

/**
 * @brief 2^32 as a double.
 * @private
 */
#define LIBRTP_NTP_FRAC (4294967296.0)

double ntp_to_double(ntp_tv ntp)
{
    double s = (double)ntp.sec;
    s += (double)ntp.frac / LIBRTP_NTP_FRAC;

    return s;
}

double ntp_to_unix(ntp_tv ntp)
{
    // Shift epoch from 1900 to 1970
    return ntp_to_double(ntp) - LIBRTP_NTP_UNIX_OFFSET;
}

ntp_tv ntp_from_double(double s)
{
    ntp_tv ntp;
    ntp.sec = (uint32_t)s;

    double frac = (s - ntp.sec);
    ntp.frac = (uint32_t)(frac * LIBRTP_NTP_FRAC);

    return ntp;
}

ntp_tv ntp_from_unix(double s)
{
    // Shift epoch from 1970 to 1900
    return ntp_from_double(s + LIBRTP_NTP_UNIX_OFFSET);
}

uint32_t ntp_short(ntp_tv ntp)
{
    // Lower 16 bits of seconds and upper 16 bits of frac.
    return (ntp.sec << 16) | (ntp.frac >> 16);
}

ntp_tv ntp_diff(ntp_tv a, ntp_tv b)
{
    double s1 = ntp_to_double(a);
    double s2 = ntp_to_double(b);

    return ntp_from_double(s1 - s2);
}