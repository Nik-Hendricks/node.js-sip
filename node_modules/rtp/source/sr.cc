#include <string>

#include "sr.h"
#include "rtp/ntp.h"

Napi::Object SrPacket::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "SrPacket", {
        InstanceMethod<&SrPacket::Serialize>("serialize", napi_enumerable),
        InstanceMethod<&SrPacket::AddReport>("addReport", napi_enumerable),
        InstanceMethod<&SrPacket::RemoveReport>("removeReport", napi_enumerable),
        InstanceMethod<&SrPacket::UpdateNtpTime>("updateNtpTime", napi_enumerable),
        InstanceAccessor<&SrPacket::GetSize>("size", napi_enumerable),
        InstanceAccessor<&SrPacket::GetVersion>("version", napi_enumerable),
        InstanceAccessor<&SrPacket::GetPadding>("padding", napi_enumerable),
        InstanceAccessor<&SrPacket::GetCount>("count", napi_enumerable),
        InstanceAccessor<&SrPacket::GetType>("type", napi_enumerable),
        InstanceAccessor<&SrPacket::GetReports>("reports", napi_enumerable),
        InstanceAccessor<&SrPacket::GetSsrc, &SrPacket::SetSsrc>("ssrc", napi_enumerable),
        InstanceAccessor<&SrPacket::GetNtpSec, &SrPacket::SetNtpSec>("ntp_sec", napi_enumerable),
        InstanceAccessor<&SrPacket::GetNtpFrac, &SrPacket::SetNtpFrac>("ntp_frac", napi_enumerable),
        InstanceAccessor<&SrPacket::GetRtpTime, &SrPacket::SetRtpTime>("rtp_ts", napi_enumerable),
        InstanceAccessor<&SrPacket::GetPktCount, &SrPacket::SetPktCount>("pkt_count", napi_enumerable),
        InstanceAccessor<&SrPacket::GetByteCount, &SrPacket::SetByteCount>("byte_count", napi_enumerable),
        InstanceAccessor<&SrPacket::GetExtension, &SrPacket::SetExtension>("ext", napi_enumerable),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("SrPacket", func);
    return exports;
}

SrPacket::SrPacket(const Napi::CallbackInfo& info) : ObjectWrap(info)
{
     Napi::Env env = info.Env();

    packet = rtcp_sr_create();
    if(!packet) {
        auto e = Napi::Error::New(env, "Failed to allocate memory");
        e.ThrowAsJavaScriptException();
    }

    if(!info.Length()) {
        rtcp_sr_init(packet);
    }
    else if(info[0].IsBuffer()) {
        auto buffer = info[0].As<Napi::Uint8Array>();
        if(rtcp_sr_parse(packet, buffer.Data(), buffer.ElementLength()) != 0) {
            auto e = Napi::Error::New(env, "Failed to parse Buffer");

            rtcp_sr_free(packet);
            packet = nullptr;

            e.ThrowAsJavaScriptException();
        }
    }
    else {
        auto e = Napi::Error::New(env, "Optional parameter must be a Buffer");

        rtcp_sr_free(packet);
        packet = nullptr;

        e.ThrowAsJavaScriptException();
    }
}

SrPacket::~SrPacket()
{
    if(packet)
        rtcp_sr_free(packet);
}

Napi::Value SrPacket::Serialize(const Napi::CallbackInfo &info)
{
    auto buffer = Napi::Buffer<uint8_t>::New(info.Env(), rtcp_sr_size(packet));
    rtcp_sr_serialize(packet, buffer.Data(), buffer.Length());

    return buffer;
}

Napi::Value SrPacket::AddReport(const Napi::CallbackInfo &info)
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

    int result = rtcp_sr_add_report(packet, &report);
    return Napi::Number::New(info.Env(), result);
}

void SrPacket::RemoveReport(const Napi::CallbackInfo &info)
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

    rtcp_sr_remove_report(packet, ssrc);
}

void SrPacket::UpdateNtpTime(const Napi::CallbackInfo &info)
{
    if(info.Length() < 1) {
        auto e = Napi::Error::New(info.Env(), "Must provide a Date object");
        e.ThrowAsJavaScriptException();
    }

    // Milliseconds since Jan 1, 1970
    double s = info[0].As<Napi::Date>().ValueOf();

    ntp_tv ntp = ntp_from_unix(s / 1000.0);
    packet->ntp_sec = ntp.sec;
    packet->ntp_frac = ntp.frac;
}

Napi::Value SrPacket::GetSize(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), rtcp_sr_size(packet));
}

Napi::Value SrPacket::GetVersion(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.version);
}

Napi::Value SrPacket::GetPadding(const Napi::CallbackInfo &info)
{
    return Napi::Boolean::New(info.Env(), packet->header.common.p);
}

Napi::Value SrPacket::GetCount(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.count);
}

Napi::Value SrPacket::GetType(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->header.common.pt);
}

Napi::Value SrPacket::GetSsrc(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->ssrc);
}

Napi::Value SrPacket::GetNtpSec(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->ntp_sec);
}

Napi::Value SrPacket::GetNtpFrac(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->ntp_frac);
}

Napi::Value SrPacket::GetRtpTime(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->rtp_ts);
}

Napi::Value SrPacket::GetReports(const Napi::CallbackInfo &info)
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

Napi::Value SrPacket::GetPktCount(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->pkt_count);
}

Napi::Value SrPacket::GetByteCount(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), packet->byte_count);
}

Napi::Value SrPacket::GetExtension(const Napi::CallbackInfo &info)
{
    auto buffer = Napi::Buffer<uint8_t>::New(info.Env(), packet->ext_size);
    memcpy(buffer.Data(), packet->ext_data, buffer.Length());

    return buffer;
}

void SrPacket::SetSsrc(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->ssrc = value.As<Napi::Number>();
}

void SrPacket::SetNtpSec(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->ntp_sec = value.As<Napi::Number>();
}

void SrPacket::SetNtpFrac(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->ntp_frac = value.As<Napi::Number>();
}

void SrPacket::SetRtpTime(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->rtp_ts = value.As<Napi::Number>();
}

void SrPacket::SetPktCount(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->pkt_count = value.As<Napi::Number>();
}

void SrPacket::SetByteCount(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    packet->byte_count = value.As<Napi::Number>();
}

void SrPacket::SetExtension(const Napi::CallbackInfo &info, const Napi::Value &value)
{
     if(value.IsNull()) {
        rtcp_sr_clear_ext(packet);
        return;
    }

    auto buffer = value.As<Napi::Uint8Array>();
    if((buffer.ElementLength() % 4) != 0) {
        auto e = Napi::Error::New(info.Env(),
            "Buffer length must be divisible by 4");

        e.ThrowAsJavaScriptException();
    }

    rtcp_sr_set_ext(packet, buffer.Data(), buffer.ElementLength());
}
