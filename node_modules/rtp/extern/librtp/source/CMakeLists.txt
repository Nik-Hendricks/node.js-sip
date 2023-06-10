list(APPEND RTP_SOURCES
    ${CMAKE_CURRENT_LIST_DIR}/ntp.c
    ${CMAKE_CURRENT_LIST_DIR}/rtcp_app.c
    ${CMAKE_CURRENT_LIST_DIR}/rtcp_bye.c
    ${CMAKE_CURRENT_LIST_DIR}/rtcp_header.c
    ${CMAKE_CURRENT_LIST_DIR}/rtcp_report.c
    ${CMAKE_CURRENT_LIST_DIR}/rtcp_rr.c
    ${CMAKE_CURRENT_LIST_DIR}/rtcp_sdes.c
    ${CMAKE_CURRENT_LIST_DIR}/rtcp_sr.c
    ${CMAKE_CURRENT_LIST_DIR}/rtcp_util.c
    ${CMAKE_CURRENT_LIST_DIR}/rtp_header.c
    ${CMAKE_CURRENT_LIST_DIR}/rtp_packet.c
    ${CMAKE_CURRENT_LIST_DIR}/rtp_source.c
    ${CMAKE_CURRENT_LIST_DIR}/util.c)

set(RTP_SOURCES ${RTP_SOURCES} PARENT_SCOPE)
