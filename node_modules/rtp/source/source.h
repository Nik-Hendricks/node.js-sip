#ifndef NODE_RTP_SOURCE_H_
#define NODE_RTP_SOURCE_H_

#include <napi.h>
#include "rtp/rtp_source.h"

class Source : public Napi::ObjectWrap<Source>
{
    public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

        Source(const Napi::CallbackInfo &info);
        ~Source();

        Napi::Value UpdateSeq(const Napi::CallbackInfo &info);
        void UpdateLost(const Napi::CallbackInfo &info);
        void UpdateLsr(const Napi::CallbackInfo &info);

        Napi::Value ToReport(const Napi::CallbackInfo &info);

        // Getters
        Napi::Value GetId(const Napi::CallbackInfo &info);

    private:
        uint32_t id = 0;
        rtp_source *source = nullptr;
};

#endif // NODE_RTP_SOURCE_H_