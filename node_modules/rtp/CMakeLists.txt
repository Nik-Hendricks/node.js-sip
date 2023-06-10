cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0042 NEW)

project(node_rtp)

set(PROJECT_DESCRIPTION "Node librtp bindings" LANGUAGES C CXX)
set(CMAKE_C_STANDARD 99)
set(CMAKE_CXX_STANDARD 11)

# Include Node-API wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR)

string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

add_subdirectory(source)
add_subdirectory(extern/librtp)

add_library(${PROJECT_NAME} SHARED ${NODE_RTP_SOURCES} ${CMAKE_JS_SRC})

set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_INC}
    ${NODE_ADDON_API_DIR}
    ${PROJECT_SOURCE_DIR}/extern/librtp/include)

target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} rtp)
