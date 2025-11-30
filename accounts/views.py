import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .models import User, OTP
from .forms import UserProfileForm

# صفحه فرم Multi-Step
def multi_step_auth(request):
    return render(request, "accounts/auth.html")

# ارسال OTP یا تشخیص نیاز به رمز
@csrf_exempt
def api_send_otp(request):
    data = json.loads(request.body)
    phone = data.get("phone_number")

    if not phone:
        return JsonResponse({"success": False, "error": "شماره موبایل الزامی است"})

    # بررسی وجود کاربر با رمز ست شده
    user = User.objects.filter(phone_number=phone).first()
    if user and user.has_usable_password():
        # اگر کاربر قبلا رمز زده، دیگر OTP نفرست
        request.session["temp_phone"] = phone
        request.session.save()
        return JsonResponse({"success": True, "skip_otp": True})

    # در غیر اینصورت OTP ارسال شود
    code = OTP.generate_otp()
    OTP.objects.create(phone_number=phone, code=code)
    print(f"OTP for {phone}: {code}")

    request.session["phone_for_auth"] = phone
    request.session.save()
    return JsonResponse({"success": True, "skip_otp": False})

# تایید OTP
@csrf_exempt
def api_verify_otp(request):
    data = json.loads(request.body)
    phone = request.session.get("phone_for_auth")
    otp_code = data.get("code")

    if not phone:
        return JsonResponse({"success": False, "error": "شماره در سشن نیست"})

    otp_obj = OTP.objects.filter(phone_number=phone, code=otp_code).last()
    if not otp_obj or not otp_obj.is_valid():
        return JsonResponse({"success": False, "error": "OTP اشتباه است"})

    user = User.objects.filter(phone_number=phone).first()
    if user:
        login(request, user)
        request.session.save()
        return JsonResponse({"success": True, "new_user": False})

    # کاربر جدید → مرحله پسورد
    request.session["temp_phone"] = phone
    request.session.save()
    return JsonResponse({"success": True, "new_user": True})

# ثبت پسورد
@csrf_exempt
def api_set_password(request):
    data = json.loads(request.body)
    phone = request.session.get("temp_phone")
    password = data.get("password")

    if not phone:
        return JsonResponse({"success": False, "error": "سشن معتبر نیست"})
    if not password:
        return JsonResponse({"success": False, "error": "رمز وارد نشده"})

    user = User.objects.filter(phone_number=phone).first()
    if user:
        # اگر کاربر قبلا وجود داشت و رمز نداشت، فقط ست شود
        user.set_password(password)
        user.save()
    else:
        # کاربر جدید
        user = User.objects.create_user(phone_number=phone, password=password)

    # پاکسازی temp_phone قبل از login
    del request.session["temp_phone"]

    # login
    login(request, user)
    request.session.save()
    return JsonResponse({"success": True})

# داشبورد
@login_required
def dashboard(request):
    user = request.user
    if request.method == "POST":
        form = UserProfileForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            return redirect("dashboard")
    else:
        form = UserProfileForm(instance=user)
    return render(request, "accounts/dashboard.html", {"user": user, "form": form})

# خروج
def user_logout(request):
    logout(request)
    return redirect('multi_step_auth')
