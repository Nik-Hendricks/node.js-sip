include(GoogleTest)

add_executable(tests
    ${PROJECT_SOURCE_DIR}/test/test_app.cc
    ${PROJECT_SOURCE_DIR}/test/test_bye.cc
    ${PROJECT_SOURCE_DIR}/test/test_ntp.cc
    ${PROJECT_SOURCE_DIR}/test/test_report.cc
    ${PROJECT_SOURCE_DIR}/test/test_rr.cc
    ${PROJECT_SOURCE_DIR}/test/test_rtp.cc
    ${PROJECT_SOURCE_DIR}/test/test_sdes.cc
    ${PROJECT_SOURCE_DIR}/test/test_sr.cc
    ${PROJECT_SOURCE_DIR}/test/test_util.cc)

target_include_directories(tests PUBLIC
    ${PROJECT_SOURCE_DIR}/include
    ${PROJECT_SOURCE_DIR}/source)

target_link_libraries(tests rtp gtest gtest_main)

gtest_discover_tests(tests)
