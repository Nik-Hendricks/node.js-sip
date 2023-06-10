#ifndef NODE_BYE_H_
#define NODE_BYE_H_

#include <napi.h>
#include "rtp/rtcp_bye.h"

class ByePacket : public Napi::ObjectWrap<ByePacket>
{
    public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

        ByePacket(const Napi::CallbackInfo &info);
        ~ByePacket();

        Napi::Value Serialize(const Napi::CallbackInfo &info);

        Napi::Value AddSource(const Napi::CallbackInfo &info);
        void RemoveSource(const Napi::CallbackInfo &info);

        // Getters
        Napi::Value GetSize(const Napi::CallbackInfo &info);
        Napi::Value GetVersion(const Napi::CallbackInfo &info);
        Napi::Value GetPadding(const Napi::CallbackInfo &info);
        Napi::Value GetCount(const Napi::CallbackInfo &info);
        Napi::Value GetType(const Napi::CallbackInfo &info);
        Napi::Value GetSources(const Napi::CallbackInfo &info);
        Napi::Value GetMessage(const Napi::CallbackInfo &info);

        // Setters
        void SetMessage(const Napi::CallbackInfo &info, const Napi:: Value &value);

    private:
        rtcp_bye *packet = nullptr;
};

#endif // NODE_BYE_H_