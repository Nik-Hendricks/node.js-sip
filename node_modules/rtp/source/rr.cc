#include <string>

#include "rr.h"

Napi::Object RrPacket::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "RrPacket", {
        InstanceMethod<&RrPacket::Serialize>("serialize", napi_enumerable),
        InstanceMethod<&RrPacket::AddReport>("addReport", napi_enumerable),
        InstanceMethod<&RrPacket::RemoveReport>("removeReport", napi_enumerable),
        InstanceAccessor<&RrPacket::GetSize>("size", napi_enumerable),
        InstanceAccessor<&RrPacket::GetVersion>("version", napi_enumerable),
        InstanceAccessor<&RrPacket::GetPadding>("padding", napi_enumerable),
        InstanceAccessor<&RrPacket::GetCount>("count", napi_enumerable),
        InstanceAccessor<&RrPacket::GetType>("type", napi_enumerable),
        InstanceAccessor<&RrPacket::GetReports>("reports", napi_enumerable),
        InstanceAccessor<&RrPacket::GetSsrc, &RrPacket::SetSsrc>("ssrc", napi_enumerable),
        InstanceAccessor<&RrPacket::GetExtension, &RrPacket::SetExtension>("ext", napi_enumerable),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("RrPacket", func);
    return exports;
}

RrPacket::RrPacket(const Napi::CallbackInfo& info) : ObjectWrap(info)
{
     Napi::Env env = info.Env();

    packet = rtcp_rr_create();
    if(!packet) {
        auto e = Napi::Error::New(env, "Failed to allocate memory");
        e.ThrowAsJavaScriptException();
        return;
    }

    if(!info.Length()) {
        rtcp_rr_init(packet);
    }
    else if(info[0].IsBuffer()) {
        auto buffer = info[0].As<Napi::Uint8Array>();
        if(rtcp_rr_parse(packet, buffer.Data(), buffer.ElementLength()) != 0) {
            auto e = Napi::Error::New(env, "Failed to parse Buffer");

            rtcp_rr_free(packet);
            packet = nullptr;

            e.ThrowAsJavaScriptException();
        }
    }
    else {
        auto e = Napi::Error::New(env, "Optional parameter must be a Buffer");

        rtcp_rr_free(packet);
        packet = nullptr;

        e.ThrowAsJavaScriptException();
    }
}

RrPacket::~RrPacket()
{
    if(packet)
        rtcp_rr_free(packet);
}

Napi::Value RrPacket::Serialize(const Napi::CallbackInfo &info)
{
    auto buffer = Napi::Buffer<uint8_t>::New(info.Env(), rtcp_rr_size(packet));
    rtcp_rr_serialize(packet, buffer.Data(), buffer.Length());

    return buffer;
}

Napi::Value RrPacket::AddReport(const Napi::CallbackInfo &info)
{
    if(info.Length() < 1) {
        auto e = Napi::Error::New(info.Env(), "Must provide a report");
        e.ThrowAsJavaScriptException();
    }

    auto value = info[0].ToObject();

    rtcp_report report;
    report.ssrc = value.Get("ssrc").ToNumber();
    report.fraction = value.Get("fraction").ToNumber();
    report.lost = value.Get("lost").ToNumber();
    report.last_seq = value.Get("last_seq").ToNumber();
    report.jitter = value.Get("jitter").ToNumber();
    report.lsr = value.Get("lsr").ToNumber();
    report.dlsr = value.Get("dlsr").ToNumber();

    int result = rtcp_rr_add_report(packet, &report);
    return Napi::Number::New(info.Env(), result);
}

void RrPacket::RemoveReport(const Napi::CallbackInfo &info)
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

    rtcp_rr_remove_report(packet, ssrc);
}

Napi::Value RrPacket::GetSize(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), rtcp_rr_size(packet));
}

Napi::Value RrPacket::GetVersion(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.version);
}

Napi::Value RrPacket::GetPadding(const Napi::CallbackInfo &info)
{
    return Napi::Boolean::New(info.Env(), packet->header.common.p);
}

Napi::Value RrPacket::GetCount(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.count);
}

Napi::Value RrPacket::GetType(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.pt);
}

Napi::Value RrPacket::GetSsrc(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->ssrc);
}

Napi::Value RrPacket::GetReports(const Napi::CallbackInfo &info)
{
    auto array = Napi::Array::New(info.Env(), packet->header.common.count);
    for(uint8_t i = 0; i < packet->header.common.count; ++i) {
        auto obj = Napi::Object::New(info.Env());

        rtcp_report *report = &packet->reports[i];
        obj.Set("ssrc", Napi::Number::New(info.Env(), report->ssrc));
        obj.Set("fraction", Napi::Number::New(info.Env(), report->fraction));
        obj.Set("lost", Napi::Number::New(info.Env(), report->lost));
        obj.Set("last_seq", Napi::Number::New(info.Env(), report->last_seq));
        obj.Set("jitter", Napi::Number::New(info.Env(), report->jitter));
        obj.Set("lsr", Napi::Number::New(info.Env(), report->lsr));
        obj.Set("dlsr", Napi::Number::New(info.Env(), report->dlsr));

        array[i] = obj;
    }

    return array;
}

Napi::Value RrPacket::GetExtension(const Napi::CallbackInfo &info)
{
    auto buffer = Napi::Buffer<uint8_t>::New(info.Env(), packet->ext_size);
    memcpy(buffer.Data(), packet->ext_data, buffer.Length());

    return buffer;
}

void RrPacket::SetSsrc(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->ssrc = value.As<Napi::Number>();
}

void RrPacket::SetExtension(const Napi::CallbackInfo &info, const Napi::Value &value)
{
     if(value.IsNull()) {
        rtcp_rr_clear_ext(packet);
        return;
    }

    auto buffer = value.As<Napi::Uint8Array>();
    if((buffer.ElementLength() % 4) != 0) {
        auto e = Napi::Error::New(info.Env(),
            "Buffer length must be divisible by 4");

        e.ThrowAsJavaScriptException();
    }

    rtcp_rr_set_ext(packet, buffer.Data(), buffer.ElementLength());
}
