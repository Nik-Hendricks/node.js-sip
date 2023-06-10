#include <string>

#include "bye.h"

Napi::Object ByePacket::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "ByePacket", {
        InstanceMethod<&ByePacket::Serialize>("serialize", napi_enumerable),
        InstanceMethod<&ByePacket::AddSource>("addSource", napi_enumerable),
        InstanceMethod<&ByePacket::RemoveSource>("removeSource", napi_enumerable),
        InstanceAccessor<&ByePacket::GetSize>("size", napi_enumerable),
        InstanceAccessor<&ByePacket::GetVersion>("version", napi_enumerable),
        InstanceAccessor<&ByePacket::GetPadding>("padding", napi_enumerable),
        InstanceAccessor<&ByePacket::GetCount>("count", napi_enumerable),
        InstanceAccessor<&ByePacket::GetType>("type", napi_enumerable),
        InstanceAccessor<&ByePacket::GetSources>("sources", napi_enumerable),
        InstanceAccessor<&ByePacket::GetMessage, &ByePacket::SetMessage>("message", napi_enumerable),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("ByePacket", func);
    return exports;
}

ByePacket::ByePacket(const Napi::CallbackInfo& info) : ObjectWrap(info)
{
    Napi::Env env = info.Env();

    packet = rtcp_bye_create();
    if(!packet) {
        auto e = Napi::Error::New(env, "Failed to allocate memory");
        e.ThrowAsJavaScriptException();
    }

    if(!info.Length()) {
        rtcp_bye_init(packet);
    }
    else if(info[0].IsBuffer()) {
        auto buffer = info[0].As<Napi::Uint8Array>();
        if(rtcp_bye_parse(packet, buffer.Data(), buffer.ElementLength()) != 0) {
            auto e = Napi::Error::New(env, "Failed to parse Buffer");

            rtcp_bye_free(packet);
            packet = nullptr;

            e.ThrowAsJavaScriptException();
        }
    }
    else {
        auto e = Napi::Error::New(env, "Optional parameter must be a Buffer");

        rtcp_bye_free(packet);
        packet = nullptr;

        e.ThrowAsJavaScriptException();
    }
}

ByePacket::~ByePacket()
{
    if(packet)
        rtcp_bye_free(packet);
}

Napi::Value ByePacket::Serialize(const Napi::CallbackInfo &info)
{
    auto buffer = Napi::Buffer<uint8_t>::New(info.Env(), rtcp_bye_size(packet));
    rtcp_bye_serialize(packet, buffer.Data(), buffer.Length());

    return buffer;
}

Napi::Value ByePacket::AddSource(const Napi::CallbackInfo &info)
{
    if(info.Length() < 1) {
        auto e = Napi::Error::New(info.Env(), "Must provide source id");
        e.ThrowAsJavaScriptException();
    }

    int result = rtcp_bye_add_source(packet, info[0].ToNumber());
    return Napi::Number::New(info.Env(), result);
}

void ByePacket::RemoveSource(const Napi::CallbackInfo &info)
{
    if(info.Length() < 1) {
        auto e = Napi::Error::New(info.Env(), "Must provide source id");
        e.ThrowAsJavaScriptException();
    }

    rtcp_bye_remove_source(packet, info[0].ToNumber());
}

Napi::Value ByePacket::GetSize(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), rtcp_bye_size(packet));
}

Napi::Value ByePacket::GetVersion(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.version);
}

Napi::Value ByePacket::GetPadding(const Napi::CallbackInfo &info)
{
    return Napi::Boolean::New(info.Env(), packet->header.common.p);
}

Napi::Value ByePacket::GetCount(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.count);
}

Napi::Value ByePacket::GetType(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.pt);
}

Napi::Value ByePacket::GetSources(const Napi::CallbackInfo &info)
{
    auto array = Napi::Array::New(info.Env(), packet->header.common.count);
    for(uint8_t i = 0; i < packet->header.common.count; ++i)
        array[i] = Napi::Number::New(info.Env(), packet->src_ids[i]);

    return array;
}

Napi::Value ByePacket::GetMessage(const Napi::CallbackInfo &info)
{
    return Napi::String::New(info.Env(), packet->message);
}

void ByePacket::SetMessage(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    if(value.IsNull()) {
        rtcp_bye_clear_message(packet);
        return;
    }

    std::string s = value.As<Napi::String>();
    rtcp_bye_set_message(packet, s.c_str());
}
