#ifndef NODE_RTP_H_
#define NODE_RTP_H_

#include <napi.h>
#include "rtp/rtp_packet.h"

class RtpPacket : public Napi::ObjectWrap<RtpPacket>
{
    public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

        RtpPacket(const Napi::CallbackInfo &info);
        ~RtpPacket();

        Napi::Value Serialize(const Napi::CallbackInfo &info);

        // Getters
        Napi::Value GetSize(const Napi::CallbackInfo &info);
        Napi::Value GetVersion(const Napi::CallbackInfo &info);
        Napi::Value GetPadding(const Napi::CallbackInfo &info);
        Napi::Value GetExtension(const Napi::CallbackInfo &info);
        Napi::Value GetCsrcCount(const Napi::CallbackInfo &info);
        Napi::Value GetMarker(const Napi::CallbackInfo &info);
        Napi::Value GetType(const Napi::CallbackInfo &info);
        Napi::Value GetSequence(const Napi::CallbackInfo &info);
        Napi::Value GetTimestamp(const Napi::CallbackInfo &info);
        Napi::Value GetSsrc(const Napi::CallbackInfo &info);
        Napi::Value GetCsrcs(const Napi::CallbackInfo &info);
        Napi::Value GetPayload(const Napi::CallbackInfo &info);

        // Setters
        void SetPadding(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetExtension(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetMarker(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetType(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetSequence(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetTimestamp(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetSsrc(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetPayload(const Napi::CallbackInfo &info, const Napi:: Value &value);

    private:
        rtp_packet *packet = nullptr;
};

#endif // NODE_RTP_H_