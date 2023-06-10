#ifndef NODE_SR_H_
#define NODE_SR_H_

#include <napi.h>
#include "rtp/rtcp_sr.h"

class SrPacket : public Napi::ObjectWrap<SrPacket>
{
    public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

        SrPacket(const Napi::CallbackInfo &info);
        ~SrPacket();

        Napi::Value Serialize(const Napi::CallbackInfo &info);

        Napi::Value AddReport(const Napi::CallbackInfo &info);
        void RemoveReport(const Napi::CallbackInfo &info);

        void UpdateNtpTime(const Napi::CallbackInfo &info);

        // Getters
        Napi::Value GetSize(const Napi::CallbackInfo &info);
        Napi::Value GetVersion(const Napi::CallbackInfo &info);
        Napi::Value GetPadding(const Napi::CallbackInfo &info);
        Napi::Value GetCount(const Napi::CallbackInfo &info);
        Napi::Value GetType(const Napi::CallbackInfo &info);
        Napi::Value GetReports(const Napi::CallbackInfo &info);
        Napi::Value GetSsrc(const Napi::CallbackInfo &info);
        Napi::Value GetNtpSec(const Napi::CallbackInfo &info);
        Napi::Value GetNtpFrac(const Napi::CallbackInfo &info);
        Napi::Value GetRtpTime(const Napi::CallbackInfo &info);
        Napi::Value GetPktCount(const Napi::CallbackInfo &info);
        Napi::Value GetByteCount(const Napi::CallbackInfo &info);
        Napi::Value GetExtension(const Napi::CallbackInfo &info);

        // Setters
        void SetSsrc(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetNtpSec(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetNtpFrac(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetRtpTime(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetPktCount(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetByteCount(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetExtension(const Napi::CallbackInfo &info, const Napi:: Value &value);

    private:
        rtcp_sr *packet = nullptr;
};

#endif // NODE_SR_H_