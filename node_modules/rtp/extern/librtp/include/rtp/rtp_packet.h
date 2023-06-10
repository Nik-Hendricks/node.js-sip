/**
 * @file rtp_packet.h
 * @brief RTP packet.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 * @ingroup rtp
 */

#ifndef LIBRTP_RTP_PACKET_H_
#define LIBRTP_RTP_PACKET_H_

#include "rtp_header.h"

#if defined(__cplusplus)
extern "C" {
#endif // __cplusplus

/**
 * @brief RTP packet.
 */
typedef struct rtp_packet {
    rtp_header *header;         /**< RTP header. */
    size_t payload_size;        /**< Size of the payload data in bytes. */
    void *payload_data;         /**< Payload data. */
} rtp_packet;

/**
 * @brief Allocate a new RTP packet.
 *
 * @return packet.
 */
rtp_packet *rtp_packet_create(void);

/**
 * @brief Free a RTP packet.
 *
 * @param [out] packet - packet to free.
 */
void rtp_packet_free(rtp_packet *packet);

/**
 * @brief Initialize an RTP packet with default values.
 *
 * @param [out] packet - packet to initialize.
 * @param [in] pt - payload type.
 * @param [in] ssrc - synchronization source identifier.
 * @param [in] seq - sequence number.
 * @param [in] ts - packet timestamp.
 */
void rtp_packet_init(
    rtp_packet *packet, uint8_t pt, uint32_t ssrc, uint16_t seq, uint32_t ts);

/**
 * @brief Returns the RTP packet size.
 *
 * @param [in] packet - packet to check.
 * @return packet size in bytes.
 */
size_t rtp_packet_size(const rtp_packet *packet);

/**
 * @brief Write an RTP packet to a buffer.
 *
 * @param [in] packet - packet to serialize.
 * @param [out] buffer - buffer to write to.
 * @param [in] size - buffer size.
 * @return number of bytes written or -1 on failure.
 */
int rtp_packet_serialize(
    const rtp_packet *packet, uint8_t *buffer, size_t size);

/**
 * @brief Fill an RTP packet from a buffer.
 *
 * This takes a copy of the payload. For a non-copy approach you can use the
 * rtp header api directly.
 *
 * @param [out] packet - empty packet to fill.
 * @param [in] buffer - buffer to read from.
 * @param [in] size - buffer size.
 * @return 0 on success.
 */
int rtp_packet_parse(rtp_packet *packet, const uint8_t *buffer, size_t size);

/**
 * @brief Set the RTP packet payload.
 *
 * Allocates a new buffer and initializes it with the passed in data. If a
 * payload buffer already exists then this method will return -1.
 *
 * @param [out] packet - packet to set on.
 * @param [in] data - payload data.
 * @param [in] size - payload data size.
 * @return 0 on success.
 */
int rtp_packet_set_payload(
    rtp_packet *packet, const void *data, size_t size);

/**
 * @brief Clear the RTP packet payload.
 *
 * @param [out] packet - packet to clear on.
 */
void rtp_packet_clear_payload(rtp_packet *packet);

#if defined(__cplusplus)
}
#endif // __cplusplus

#endif // LIBRTP_RTP_PACKET_H_
