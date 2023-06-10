#include <string>

#include "app.h"

Napi::Object AppPacket::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "AppPacket", {
        InstanceMethod<&AppPacket::Serialize>("serialize", napi_enumerable),
        InstanceAccessor<&AppPacket::GetSize>("size", napi_enumerable),
        InstanceAccessor<&AppPacket::GetVersion>("version", napi_enumerable),
        InstanceAccessor<&AppPacket::GetPadding>("padding", napi_enumerable),
        InstanceAccessor<&AppPacket::GetType>("type", napi_enumerable),
        InstanceAccessor<&AppPacket::GetSubtype, &AppPacket::SetSubtype>("subtype", napi_enumerable),
        InstanceAccessor<&AppPacket::GetSource, &AppPacket::SetSource>("ssrc", napi_enumerable),
        InstanceAccessor<&AppPacket::GetName, &AppPacket::SetName>("name", napi_enumerable),
        InstanceAccessor<&AppPacket::GetData, &AppPacket::SetData>("data", napi_enumerable),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("AppPacket", func);
    return exports;
}

AppPacket::AppPacket(const Napi::CallbackInfo& info) : ObjectWrap(info)
{
    Napi::Env env = info.Env();

    packet = rtcp_app_create();
    if(!packet) {
        auto e = Napi::Error::New(env, "Failed to allocate memory");
        e.ThrowAsJavaScriptException();
    }

    if(!info.Length()) {
        rtcp_app_init(packet, 0);
    }
    else if(info[0].IsBuffer()) {
        auto buffer = info[0].As<Napi::Uint8Array>();
        if(rtcp_app_parse(packet, buffer.Data(), buffer.ElementLength()) != 0) {
            auto e = Napi::Error::New(env, "Failed to parse Buffer");

            rtcp_app_free(packet);
            packet = nullptr;

            e.ThrowAsJavaScriptException();
        }
    }
    else {
        auto e = Napi::Error::New(env, "Optional parameter must be a Buffer");

        rtcp_app_free(packet);
        packet = nullptr;

        e.ThrowAsJavaScriptException();
    }
}

AppPacket::~AppPacket()
{
    if(packet)
        rtcp_app_free(packet);
}

Napi::Value AppPacket::Serialize(const Napi::CallbackInfo &info)
{
    auto buffer = Napi::Buffer<uint8_t>::New(info.Env(), rtcp_app_size(packet));
    rtcp_app_serialize(packet, buffer.Data(), buffer.Length());

    return buffer;
}

Napi::Value AppPacket::GetSize(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), rtcp_app_size(packet));
}

Napi::Value AppPacket::GetVersion(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.app.version);
}

Napi::Value AppPacket::GetPadding(const Napi::CallbackInfo &info)
{
    return Napi::Boolean::New(info.Env(), packet->header.app.p);
}

Napi::Value AppPacket::GetType(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.app.pt);
}

Napi::Value AppPacket::GetSubtype(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.app.subtype);
}

Napi::Value AppPacket::GetSource(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->ssrc);
}

Napi::Value AppPacket::GetName(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->name);
}

Napi::Value AppPacket::GetData(const Napi::CallbackInfo &info)
{
    auto buffer = Napi::Buffer<uint8_t>::New(info.Env(), packet->app_size);
    memcpy(buffer.Data(), packet->app_data, buffer.Length());

    return buffer;
}

void AppPacket::SetSubtype(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->header.app.subtype = value.As<Napi::Number>();
}

void AppPacket::SetSource(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->ssrc = value.As<Napi::Number>();
}

void AppPacket::SetName(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->name = value.As<Napi::Number>();
}

void AppPacket::SetData(const Napi::CallbackInfo &info, const Napi::Value &value)
{
     if(value.IsNull()) {
        rtcp_app_clear_data(packet);
        return;
    }

    auto buffer = value.As<Napi::Uint8Array>();
    rtcp_app_set_data(packet, buffer.Data(), buffer.ElementLength());
}
