#include "source.h"

#include "rtp/ntp.h"
#include "rtp/rtcp_report.h"

Napi::Object Source::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "Source", {
        InstanceMethod<&Source::UpdateSeq>("updateSeq", napi_enumerable),
        InstanceMethod<&Source::UpdateLost>("updateLost", napi_enumerable),
        InstanceMethod<&Source::UpdateLsr>("updateLsr", napi_enumerable),
        InstanceMethod<&Source::ToReport>("toReport", napi_enumerable),
        InstanceAccessor<&Source::GetId>("id", napi_enumerable),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("Source", func);
    return exports;
}

Source::Source(const Napi::CallbackInfo& info) : ObjectWrap(info)
{
    if(info.Length() < 1) {
        auto e = Napi::TypeError::New(info.Env(), "Must provide an id");
        e.ThrowAsJavaScriptException();
    }

    id = info[0].ToNumber();
}

Source::~Source()
{
    if(source)
        rtp_source_free(source);
}

Napi::Value Source::UpdateSeq(const Napi::CallbackInfo &info)
{
    if(info.Length() < 1) {
        auto e = Napi::TypeError::New(info.Env(),
            "Must provide a sequence number");

        e.ThrowAsJavaScriptException();
    }

    int seq = info[0].ToNumber();
    if(seq < 0) {
        auto e = Napi::TypeError::New(info.Env(),
            "Sequence number cannot be negative");

        e.ThrowAsJavaScriptException();
    }

    if(!source) {
        // First time initialization
        source = rtp_source_create();
        if(!source) {
            auto e = Napi::Error::New(info.Env(), "Failed to allocate memory");
            e.ThrowAsJavaScriptException();
        }

        rtp_source_init(source, id, seq);
    }

    int result = rtp_source_update_seq(source, seq);
    return Napi::Number::New(info.Env(), result);
}

void Source::UpdateLost(const Napi::CallbackInfo &info)
{
    if(!source)
        return;

    rtp_source_update_lost(source);
}

void Source::UpdateLsr(const Napi::CallbackInfo &info)
{
    if(!source)
        return;

    if(info.Length() < 2) {
        auto e = Napi::TypeError::New(info.Env(),
            "Must provide values for NTP seconds and fractional seconds");

        e.ThrowAsJavaScriptException();
    }

    ntp_tv tc = {
        .sec = info[0].ToNumber(),
        .frac = info[1].ToNumber(),
    };

    rtp_source_update_lsr(source, tc);
}

Napi::Value Source::ToReport(const Napi::CallbackInfo &info)
{
    if(info.Length() < 1) {
        auto e = Napi::TypeError::New(info.Env(), "Must provide a Date object");
        e.ThrowAsJavaScriptException();
    }

    if(!source)
        return info.Env().Null();

    // Milliseconds since Jan 1, 1970
    double s = (info[0].As<Napi::Date>().ValueOf());
    ntp_tv tc = ntp_from_unix(s / 1000.0);

    rtcp_report report;
    rtcp_report_init(&report, source, tc);

    auto obj = Napi::Object::New(info.Env());
    obj.Set("ssrc", Napi::Number::New(info.Env(), report.ssrc));
    obj.Set("fraction", Napi::Number::New(info.Env(), report.fraction));
    obj.Set("lost", Napi::Number::New(info.Env(), report.lost));
    obj.Set("last_seq", Napi::Number::New(info.Env(), report.last_seq));
    obj.Set("jitter", Napi::Number::New(info.Env(), report.jitter));
    obj.Set("lsr", Napi::Number::New(info.Env(), report.lsr));
    obj.Set("dlsr", Napi::Number::New(info.Env(), report.dlsr));

    return obj;
}

Napi::Value Source::GetId(const Napi::CallbackInfo &info)
{
    return Napi::Number::New(info.Env(), id);
}
