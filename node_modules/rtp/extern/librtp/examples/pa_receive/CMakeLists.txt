set(NAME pa_receive)

find_package(PulseAudio REQUIRED)
find_package(PkgConfig REQUIRED)

pkg_check_modules(Opus REQUIRED QUIET opus)

add_executable(${NAME} ${CMAKE_CURRENT_LIST_DIR}/main.c)

target_link_libraries(${NAME} PRIVATE rtp pulse pulse-simple opus)

target_include_directories(${NAME} PRIVATE ${CMAKE_SOURCE_DIR}/include)

target_compile_options(${NAME} PRIVATE -Wall -Wextra)

set_target_properties(${NAME} PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
