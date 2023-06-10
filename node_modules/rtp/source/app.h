#ifndef NODE_APP_H_
#define NODE_APP_H_

#include <napi.h>
#include "rtp/rtcp_app.h"

class AppPacket : public Napi::ObjectWrap<AppPacket>
{
    public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

        AppPacket(const Napi::CallbackInfo &info);
        ~AppPacket();

        Napi::Value Serialize(const Napi::CallbackInfo &info);

        // Getters
        Napi::Value GetSize(const Napi::CallbackInfo &info);
        Napi::Value GetVersion(const Napi::CallbackInfo &info);
        Napi::Value GetPadding(const Napi::CallbackInfo &info);
        Napi::Value GetType(const Napi::CallbackInfo &info);
        Napi::Value GetSubtype(const Napi::CallbackInfo &info);
        Napi::Value GetSource(const Napi::CallbackInfo &info);
        Napi::Value GetName(const Napi::CallbackInfo &info);
        Napi::Value GetData(const Napi::CallbackInfo &info);

        // Setters
        void SetSubtype(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetSource(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetName(const Napi::CallbackInfo &info, const Napi:: Value &value);
        void SetData(const Napi::CallbackInfo &info, const Napi:: Value &value);

    private:
        rtcp_app *packet = nullptr;
};

#endif // NODE_APP_H_