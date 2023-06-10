#include <string>

#include "sdes.h"

Napi::Object SdesPacket::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "SdesPacket", {
        InstanceMethod<&SdesPacket::Serialize>("serialize", napi_enumerable),
        InstanceMethod<&SdesPacket::AddSource>("addSource", napi_enumerable),
        InstanceMethod<&SdesPacket::RemoveSource>("removeSource", napi_enumerable),
        InstanceAccessor<&SdesPacket::GetSize>("size", napi_enumerable),
        InstanceAccessor<&SdesPacket::GetVersion>("version", napi_enumerable),
        InstanceAccessor<&SdesPacket::GetPadding>("padding", napi_enumerable),
        InstanceAccessor<&SdesPacket::GetCount>("count", napi_enumerable),
        InstanceAccessor<&SdesPacket::GetType>("type", napi_enumerable),
        InstanceAccessor<&SdesPacket::GetSources>("sources", napi_enumerable),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("SdesPacket", func);
    return exports;
}

SdesPacket::SdesPacket(const Napi::CallbackInfo& info) : ObjectWrap(info)
{
    Napi::Env env = info.Env();

    packet = rtcp_sdes_create();
    if(!packet) {
        auto e = Napi::Error::New(env, "Failed to allocate memory");
        e.ThrowAsJavaScriptException();
    }

    if(!info.Length()) {
        rtcp_sdes_init(packet);
    }
    else if(info[0].IsBuffer()) {
        auto buffer = info[0].As<Napi::Uint8Array>();
        if(rtcp_sdes_parse(packet, buffer.Data(), buffer.ElementLength()) != 0) {
            auto e = Napi::Error::New(env, "Failed to parse Buffer");

            rtcp_sdes_free(packet);
            packet = nullptr;

            e.ThrowAsJavaScriptException();
        }
    }
    else {
        auto e = Napi::Error::New(env, "Optional parameter must be a Buffer");

        rtcp_sdes_free(packet);
        packet = nullptr;

        e.ThrowAsJavaScriptException();
    }
}

SdesPacket::~SdesPacket()
{
    if(packet)
        rtcp_sdes_free(packet);
}

Napi::Value SdesPacket::Serialize(const Napi::CallbackInfo &info)
{
    auto buffer = Napi::Buffer<uint8_t>::New(info.Env(), rtcp_sdes_size(packet));
    rtcp_sdes_serialize(packet, buffer.Data(), buffer.Length());

    return buffer;
}

void SdesPacket::AddSource(const Napi::CallbackInfo &info)
{
    int result;

    if(info.Length() < 1) {
        auto e = Napi::Error::New(info.Env(), "Must provide a source");
        e.ThrowAsJavaScriptException();
    }

    auto value = info[0].ToObject();

    const unsigned int ssrc = value.Get("ssrc").ToNumber();
    if(rtcp_sdes_find_entry(packet, ssrc) != -1) {
        auto e = Napi::Error::New(info.Env(), "Source already exists");
        e.ThrowAsJavaScriptException();
    }

    if(rtcp_sdes_add_entry(packet, ssrc) < 0) {
        auto e = Napi::Error::New(info.Env(), "Failed to add source");
        e.ThrowAsJavaScriptException();
    }

    if(value.Has("cname")) {
        std::string s = value.Get("cname").ToString();
        if(rtcp_sdes_set_item(packet, ssrc, RTCP_SDES_CNAME, s.c_str()) != 0) {
            auto e = Napi::Error::New(info.Env(), "Failed to set CNAME");
            e.ThrowAsJavaScriptException();
        }
    }

    if(value.Has("name")) {
        std::string s = value.Get("name").ToString();
        if(rtcp_sdes_set_item(packet, ssrc, RTCP_SDES_NAME, s.c_str()) != 0) {
            auto e = Napi::Error::New(info.Env(), "Failed to set NAME");
            e.ThrowAsJavaScriptException();
        }
    }

    if(value.Has("email")) {
        std::string s = value.Get("email").ToString();
        if(rtcp_sdes_set_item(packet, ssrc, RTCP_SDES_EMAIL, s.c_str()) != 0) {
            auto e = Napi::Error::New(info.Env(), "Failed to set EMAIL");
            e.ThrowAsJavaScriptException();
        }
    }

    if(value.Has("phone")) {
        std::string s = value.Get("phone").ToString();
        if(rtcp_sdes_set_item(packet, ssrc, RTCP_SDES_PHONE, s.c_str()) != 0) {
            auto e = Napi::Error::New(info.Env(), "Failed to set PHONE");
            e.ThrowAsJavaScriptException();
        }
    }

    if(value.Has("loc")) {
        std::string s = value.Get("loc").ToString();
        if(rtcp_sdes_set_item(packet, ssrc, RTCP_SDES_LOC, s.c_str()) != 0) {
            auto e = Napi::Error::New(info.Env(), "Failed to set LOC");
            e.ThrowAsJavaScriptException();
        }
    }

    if(value.Has("tool")) {
        std::string s = value.Get("tool").ToString();
        if(rtcp_sdes_set_item(packet, ssrc, RTCP_SDES_TOOL, s.c_str()) != 0) {
            auto e = Napi::Error::New(info.Env(), "Failed to set TOOL");
            e.ThrowAsJavaScriptException();
        }
    }

    if(value.Has("note")) {
        std::string s = value.Get("note").ToString();
        if(rtcp_sdes_set_item(packet, ssrc, RTCP_SDES_NOTE, s.c_str()) != 0) {
            auto e = Napi::Error::New(info.Env(), "Failed to set NOTE");
            e.ThrowAsJavaScriptException();
        }
    }

    if(value.Has("priv")) {
        std::string s = value.Get("priv").ToString();
        if(rtcp_sdes_set_item(packet, ssrc, RTCP_SDES_PRIV, s.c_str()) != 0) {
            auto e = Napi::Error::New(info.Env(), "Failed to set PRIV");
            e.ThrowAsJavaScriptException();
        }
    }
}

void SdesPacket::RemoveSource(const Napi::CallbackInfo &info)
{
    if(info.Length() < 1) {
        auto e = Napi::Error::New(info.Env(), "Must provide a report id");
        e.ThrowAsJavaScriptException();
    }

    int ssrc;
    if(info[0].IsNumber())
        ssrc = info[0].ToNumber();
    else
        ssrc = info[0].ToObject().Get("ssrc").ToNumber();

    rtcp_sdes_remove_entry(packet, ssrc);
}

Napi::Value SdesPacket::GetSources(const Napi::CallbackInfo &info)
{
    auto array = Napi::Array::New(info.Env(), packet->header.common.count);
    for(uint8_t i = 0; i < packet->header.common.count; ++i) {
        rtcp_sdes_entry *entry = &packet->srcs[i];

        auto obj = Napi::Object::New(info.Env());
        obj.Set("ssrc", Napi::Number::New(info.Env(), entry->id));
        for(uint8_t j = 0; j < entry->item_count; ++j) {
            rtcp_sdes_item *item = &entry->items[j];
            auto value = Napi::String::New(info.Env(),
                static_cast<char*>(item->data), item->length);

            switch(item->type) {
                case RTCP_SDES_CNAME:
                    obj.Set("cname", value);
                    break;
                case RTCP_SDES_NAME:
                    obj.Set("name", value);
                    break;
                case RTCP_SDES_EMAIL:
                    obj.Set("email", value);
                    break;
                case RTCP_SDES_PHONE:
                    obj.Set("phone", value);
                    break;
                case RTCP_SDES_LOC:
                    obj.Set("loc", value);
                    break;
                case RTCP_SDES_TOOL:
                    obj.Set("tool", value);
                    break;
                case RTCP_SDES_NOTE:
                    obj.Set("note", value);
                    break;
                case RTCP_SDES_PRIV:
                    obj.Set("priv", value);
                    break;
            }
        }

        array[i] = obj;
    }

    return array;
}

Napi::Value SdesPacket::GetSize(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), rtcp_sdes_size(packet));
}

Napi::Value SdesPacket::GetVersion(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.version);
}

Napi::Value SdesPacket::GetPadding(const Napi::CallbackInfo &info)
{
    return Napi::Boolean::New(info.Env(), packet->header.common.p);
}

Napi::Value SdesPacket::GetCount(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.count);
}

Napi::Value SdesPacket::GetType(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.pt);
}
