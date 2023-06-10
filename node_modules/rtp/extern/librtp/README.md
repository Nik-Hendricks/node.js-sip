# librtp

C99 RTP/RTCP library

### Build

This project uses the cmake build system. To build run the following:

    mkdir build
    cd build
    cmake ..
    make

### Test

This project uses the google test system. To build tests run the following:

    sudo apt install googletest libgtest-dev
    cmake -DLIBRTP_BUILD_TESTS=ON ..
    make && make test

### Examples

This project includes Linux (PulseAudio) example applications.  To build
examples run the following:

    sudo apt install libopus-dev libpulse-dev
    cmake -DLIBRTP_BUILD_EXAMPLES=ON ..
    make

### Documentation

This project uses the Doxygen documentation engine. To build documentation run
the following:

    sudo apt install doxygen
    cmake -DLIBRTP_BUILD_DOCS=ON ..
    make
