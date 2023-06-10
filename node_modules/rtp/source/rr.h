#ifndef NODE_RR_H_
#define NODE_RR_H_

#include <napi.h>
#include "rtp/rtcp_rr.h"

class RrPacket : public Napi::ObjectWrap<RrPacket>
{
    public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

        RrPacket(const Napi::CallbackInfo &info);
        ~RrPacket();

        Napi::Value Serialize(const Napi::CallbackInfo &info);

        Napi::Value AddReport(const Napi::CallbackInfo &info);
        void RemoveReport(const Napi::CallbackInfo &info);

        // Getters
        Napi::Value GetSize(const Napi::CallbackInfo &info);
        Napi::Value GetVersion(const Napi::CallbackInfo &info);
        Napi::Value GetPadding(const Napi::CallbackInfo &info);
        Napi::Value GetCount(const Napi::CallbackInfo &info);
        Napi::Value GetType(const Napi::CallbackInfo &info);
        Napi::Value GetReports(const Napi::CallbackInfo &info);
        Napi::Value GetSsrc(const Napi::CallbackInfo &info);
        Napi::Value GetExtension(const Napi::CallbackInfo &info);

        // Setters
        void SetSsrc(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetExtension(const Napi::CallbackInfo &info, const Napi:: Value &value);

    private:
        rtcp_rr *packet = nullptr;
};

#endif // NODE_RR_H_