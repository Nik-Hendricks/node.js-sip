#ifndef NODE_SDES_H_
#define NODE_SDES_H_

#include <napi.h>
#include "rtp/rtcp_sdes.h"

class SdesPacket : public Napi::ObjectWrap<SdesPacket>
{
    public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

        SdesPacket(const Napi::CallbackInfo &info);
        ~SdesPacket();

        Napi::Value Serialize(const Napi::CallbackInfo &info);

        void AddSource(const Napi::CallbackInfo &info);
        void RemoveSource(const Napi::CallbackInfo &info);

        // Getters
        Napi::Value GetSize(const Napi::CallbackInfo &info);
        Napi::Value GetVersion(const Napi::CallbackInfo &info);
        Napi::Value GetPadding(const Napi::CallbackInfo &info);
        Napi::Value GetCount(const Napi::CallbackInfo &info);
        Napi::Value GetType(const Napi::CallbackInfo &info);
        Napi::Value GetSources(const Napi::CallbackInfo &info);

    private:
        rtcp_sdes *packet = nullptr;
};

#endif // NODE_SDES_H_