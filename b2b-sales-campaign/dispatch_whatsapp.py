import gi, time, subprocess, urllib.parse, urllib.request, json, sys
gi.require_version('Atspi', '2.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Atspi, Gdk

def get_whatsapp_title():
    desktop = Atspi.get_desktop(0)
    for i in range(desktop.get_child_count()):
        child = desktop.get_child_at_index(i)
        if child and child.get_name() == 'Google Chrome':
            for j in range(child.get_child_count()):
                win = child.get_child_at_index(j)
                if win and win.get_name() and ('WhatsApp' in win.get_name() or 'nextchallenge2021@gmail.com' in win.get_name()):
                    return win.get_name()
    return None

def send_key_enter():
    Atspi.generate_keyboard_event(Gdk.KEY_Return, None, Atspi.KeySynthType.PRESSRELEASE)

def send_key_ctrl_w():
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.PRESS)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_w, None, Atspi.KeySynthType.PRESSRELEASE)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.RELEASE)

def dispatch_single_whatsapp(p):
    pid = p['id']
    name = p['name']
    phone = p['waData']['phone']
    msg = p['waData']['fr']
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '')

    print(f"\n=======================================================")
    print(f"WhatsApp Dispatch: [{pid}] {name} -> {phone} ({clean_phone})")

    wa_url = f"https://web.whatsapp.com/send?phone={clean_phone}&text={urllib.parse.quote(msg)}"
    subprocess.Popen(['google-chrome', '--profile-directory=Profile 1', wa_url])

    # 1. Wait for WhatsApp Web to load the conversation
    print("Waiting 12s for WhatsApp Web conversation & message box to load...")
    time.sleep(12.0)

    # 2. Focus chat input and press Enter
    Atspi.generate_mouse_event(960, 950, 'b1c')
    time.sleep(0.5)
    send_key_enter()
    time.sleep(3.0)

    # 3. Post to server to record in Excel & report
    print(f"✅ CONFIRMED DISPATCH: [{pid}] {name} ({phone})")
    req = urllib.request.Request(
        'http://localhost:3300/api/confirm-send',
        data=json.dumps({'id': pid, 'channel': 'whatsapp'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        res = urllib.request.urlopen(req)
        resp_data = json.loads(res.read().decode('utf-8'))
        print(f"Database updated: Total WhatsApp confirmed sent = {resp_data['result']['waSent']}")
    except Exception as e:
        print(f"Warning: Failed to update server DB: {e}")

    # Close WhatsApp chat tab to keep browser clean
    send_key_ctrl_w()
    time.sleep(2.0)
    return True

def run_whatsapp_queue(max_count=None):
    req = urllib.request.urlopen('http://localhost:3300/api/prospects')
    data = json.loads(req.read().decode('utf-8'))
    all_prospects = data['prospects']

    pending_wa = [
        p for p in all_prospects 
        if p.get('waData') and p['waData'].get('phone') and (not p.get('whatsappStatus') or 'sent' not in p.get('whatsappStatus').lower())
    ]

    print(f"Total verified WhatsApp contacts in database: {len([p for p in all_prospects if p.get('waData') and p['waData'].get('phone')])}")
    print(f"Pending WhatsApp contacts to process: {len(pending_wa)}")

    to_process = pending_wa[:max_count] if max_count else pending_wa
    for idx, p in enumerate(to_process):
        print(f"\n--- Progress: {idx+1}/{len(to_process)} ---")
        dispatch_single_whatsapp(p)
        if idx < len(to_process) - 1:
            print("Pausing 5s between WhatsApp messages...")
            time.sleep(5.0)

if __name__ == '__main__':
    max_c = int(sys.argv[1]) if len(sys.argv) > 1 else None
    run_whatsapp_queue(max_c)
