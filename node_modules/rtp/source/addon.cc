#include "app.h"
#include "bye.h"
#include "rr.h"
#include "rtp.h"
#include "sdes.h"
#include "source.h"
#include "sr.h"

#include "rtp/rtcp_util.h"

Napi::Value RtcpInterval(const Napi::CallbackInfo &info)
{
    if(info.Length() < 1) {
        auto e = Napi::Error::New(info.Env(), "Must provide parameters");
        e.ThrowAsJavaScriptException();
    }

    auto value = info[0].ToObject();

    int members = value.Get("members").ToNumber();
    int senders = value.Get("senders").ToNumber();
    double rtcp_bw = value.Get("rtcp_bw").ToNumber();
    bool we_sent = value.Get("we_sent").ToBoolean();
    double avg_rtcp_size = value.Get("avg_rtcp_size").ToNumber();
    bool initial = value.Get("initial").ToBoolean();

    const double t = rtcp_interval(
        members, senders, rtcp_bw, we_sent, avg_rtcp_size, initial);

    return Napi::Number::New(info.Env(), t * 1000.0);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
    AppPacket::Init(env, exports);
    ByePacket::Init(env, exports);
    RrPacket::Init(env, exports);
    RtpPacket::Init(env, exports);
    SdesPacket::Init(env, exports);
    SrPacket::Init(env, exports);

    Source::Init(env, exports);

    exports.Set(
        Napi::String::New(env, "rtcpInterval"),
        Napi::Function::New(env, RtcpInterval));

    return exports;
}

NODE_API_MODULE(addon, InitAll)