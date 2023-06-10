/**
 * @file main.c
 * @brief Example Opus receiver using PulseAudio simple API.
 * @author Wilkins White
 * @copyright 2022 Daxbot
 */

#include <stdlib.h>
#include <stdio.h>
#include <stdbool.h>
#include <signal.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <getopt.h>

#include <netdb.h>
#include <netinet/ip.h>

#include <opus/opus.h>
#include <pulse/simple.h>
#include <pulse/error.h>

#include "rtp/rtp_header.h"

#define DEFAULT_PORT (5002)
#define DEFAULT_RATE (48000)    // 48kHz
#define DEFAULT_DURATION (20)   // 20ms
#define DEFAULT_CHANNELS (1)    // mono

/** Set by Ctrl-C to trigger shutdown. */
static sig_atomic_t shutdown_flag = false;

/** Command line arguments. */
static struct option opts_long[] = {
    {"port",        1, NULL, 'p'},
    {"rate",        1, NULL, 'r'},
    {"duration",    1, NULL, 'd'},
    {"channels",    1, NULL, 'c'},
    {"help",        0, NULL, 'H'},
    {"verbose",     0, NULL, 'v'},
    {NULL,          0, NULL, 0},
};

static void signal_cb(int signal)
{
    (void)signal;
    shutdown_flag = true;
}

int main(int argc, char *argv[])
{
    int error = 0;
    uint32_t port = DEFAULT_PORT;
    uint32_t rate = DEFAULT_RATE;
    uint32_t duration = DEFAULT_DURATION;
    uint8_t channels = DEFAULT_CHANNELS;
    bool verbose = false;

    while(1) {
        int c = getopt_long(argc, argv, "p:r:d:c:Hv", opts_long, NULL);
        if(c == -1)
            break;

        switch(c) {
            default:
            case 'H':
                printf("\n");
                printf("Author: Wilkins White\n");
                printf("Copyright: Daxbot 2022\n");
                printf("\n");
                printf("Usage: %s [options]\n", argv[0]);
                printf("\n");
                printf("Supported options:\n");
                printf("  -H, --help        Displays this menu\n");
                printf("  -p, --port        RTP receive port, e.g. --port=%d\n", DEFAULT_PORT);
                printf("  -r, --rate        Sample rate in Hz, e.g. --rate=%d\n", DEFAULT_RATE);
                printf("  -d, --duration    Frame duration in ms, e.g. --duration=%d\n", DEFAULT_DURATION);
                printf("  -c, --channels    Audio channel count, e.g. --channels=%d\n", DEFAULT_CHANNELS);
                printf("  -v, --verbose     Enable verbose printing\n");
                printf("\n");
                exit(1);

            case 'p':
                port = strtoul(optarg, NULL, 0);
                printf("Port set to %d\n", port);
                break;

            case 'r':
                rate = strtoul(optarg, NULL, 0);
                printf("Sample rate set to %d Hz\n", rate);
                break;

            case 'd':
                duration = strtoul(optarg, NULL, 0);
                printf("Frame duration set to %d ms\n", duration);
                break;

            case 'c':
                channels = strtoul(optarg, NULL, 0);
                printf("Channels set to %d\n", channels);
                break;

            case 'v':
                verbose = true;
                printf("Verbose logging enabled\n");
                break;
        }
    }

    // Sanity checks
    if(!(rate == 8000|| rate == 12000 || rate == 16000 || rate == 24000|| rate == 48000)) {
        fprintf(stderr, "Sample rate must be 8kHz, 12kHz, 16kHz, 24kHz, or 48kHz\n");
        error = 1;
    }

    if(!(duration == 5 || duration == 10 || duration == 20 || duration == 40 || duration == 60)) {
        fprintf(stderr, "Frame duration must be 5, 10, 20, 40, or 60\n");
        error = 1;
    }

    if(!(channels == 1 || channels == 2)) {
        fprintf(stderr, "Channel count must be 1 (mono) or 2 (stereo)\n");
        error = 1;
    }

    if(error)
        exit(EXIT_FAILURE);

    // Capture SIGINT/SIGTERM and set shutdown_flag for cleanup
    struct sigaction sighandler;
    sigemptyset(&sighandler.sa_mask);
    sighandler.sa_handler = signal_cb;
    sighandler.sa_flags = 0;

    sigaction(SIGINT, &sighandler, NULL);
    sigaction(SIGTERM, &sighandler, NULL);

    /* Allocate the frame buffer. Note that the frame buffer size should be
     * calculated from the frame duration.
     */
    const int frame_samples = (rate * duration) / 1000;
    const int frame_size = channels * frame_samples * sizeof(int16_t);
    int16_t *frame = (int16_t*)malloc(frame_size);

    // Create the Opus decoder
    OpusDecoder *dec = opus_decoder_create(rate, channels, &error);

    if(error != OPUS_OK) {
        fprintf(stderr, "Failed to create decoder: %d\n", error);
        exit(EXIT_FAILURE);
    }

    /* Create a Linux Datagram socket for receiving UDP packets. Replace this
     * with your platform's transport layer.
     */
    int fd = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (fd < 0) {
        fprintf(stderr, "Failed to create socket: %s\n", strerror(errno));
        exit(EXIT_FAILURE);
    }

    int optval = 0;
    error = setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(int));
    if(error < 0) {
        fprintf(stderr, "Failed to set socket options: %s\n", strerror(errno));
        exit(EXIT_FAILURE);
    }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(struct sockaddr_in));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(port);

    // Bind socket
    if(bind(fd, (struct sockaddr *)&addr, sizeof(struct sockaddr_in)) < 0) {
        fprintf(stderr, "Failed to bind socket: %s\n", strerror(errno));
        exit(EXIT_FAILURE);
    }

    /* Create a simple PulseAudio stream for audio playback on linux.
     * Replace this with your platform's hardware access layer.
     */
    const pa_sample_spec ss = {
        .format = PA_SAMPLE_S16LE,
        .rate = rate,
        .channels = channels
    };

    const pa_buffer_attr attr = {
        .maxlength = (uint32_t)-1,
        .tlength = (uint32_t)-1,
        .prebuf = (uint32_t)frame_samples,
        .minreq = (uint32_t)-1,
        .fragsize = (uint32_t)-1,
    };

    pa_simple *s = pa_simple_new(
        NULL,                           // Use default pulseaudio server
        "opus-receive",                 // Application name
        PA_STREAM_PLAYBACK,             // Stream direction
        NULL,                           // Use default device
        "playback",                     // Stream description
        &ss,                            // Sample format
        NULL,                           // Use default channel map
        &attr,                          // Buffering attributes
        &error                          // Error code
    );

    if(s == NULL) {
        fprintf(stderr, "Failed to create stream: %s\n", pa_strerror(error));
        exit(EXIT_FAILURE);
    }

    while(!shutdown_flag) {
        // Read encoded data from the socket
        uint8_t data[4096];
        int n = recvfrom(fd, data, sizeof(data), MSG_WAITALL, NULL, NULL);
        if(n < 0) {
            fprintf(stderr, "Failed to receive packet: %s\n", strerror(errno));
            break;
        }

        // Deserialize the frame
        rtp_header *header = rtp_header_create();
        if(rtp_header_parse(header, data, n) < 0) {
            fprintf(stderr, "Bad packet - dropping\n");
            continue;
        }

        // Print the header
        if(verbose) {
            printf("[ 0x%02x", data[0]);

            for(int i = 1; i < rtp_header_size(header); ++i)
                printf(", 0x%02x", data[i]);

            printf(" ... ] (%d bytes)\n", n);
        }

        // Decode the frame with Opus
        const int header_size = rtp_header_size(header);
        const uint8_t *payload = data + header_size;
        const int payload_size = n - header_size;

        int size = opus_decode(dec, payload, payload_size,
            frame, frame_samples, false);

        if(size < 0) {
            fprintf(stderr, "Decoder error: %d\n", size);
            break;
        }

        // Free the header
        rtp_header_free(header);

        // Play the frame
        if(pa_simple_write(s, frame, frame_size, &error) < 0) {
            fprintf(stderr, "Failed to write frame: %s\n", pa_strerror(error));
            break;
        }
    }

    printf("Shutting down\n");

    // Finish playing any queued frames
    if(pa_simple_drain(s, &error) < 0)
        fprintf(stderr, "Failed to drain stream: %s\n", pa_strerror(error));

    // Cleanup
    opus_decoder_destroy(dec);
    pa_simple_free(s);
    free(frame);

    exit(EXIT_SUCCESS);
}