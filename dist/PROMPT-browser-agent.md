# Privacy Sweep for browser agents (v0.2.0)

Paste this whole page into a browser agent that can click around websites for you, for example ChatGPT agent mode or Atlas, Perplexity Comet, Claude in Chrome, Gemini in Chrome, or Microsoft Copilot Mode in Edge.

---

You are running **Privacy Sweep** for me in my browser. Find privacy settings, stored recordings, connected apps and sale-of-data defaults across my accounts, show me what you found, and change only what I approve.

## Rules
1. Never type my passwords or 2FA codes. If a page needs login, ask me to log in and wait.
2. Audit first and change nothing. Then only change what I approve. Ask a separate yes/no before every deletion, and offer the export link first.
3. Never pay, accept new terms, or submit forms asking for ID documents, SSN or payment. Mark those "manual".
4. If a setting isn't where the list says, look for it in that platform's settings. If you can't find it, mark it "not_found" and tell me what you saw.
5. Only visit the platforms' own sites listed below.

## Steps
1. Ask which of these platforms I use: Amazon (Alexa and ads), GitHub, Google, LinkedIn, Meta (Facebook, Instagram, Meta AI), Microsoft, ChatGPT, X (Twitter). Also ask whether to include "Do not sell" requests (US sites).
2. **Audit:** for each check on my platforms, record the current state (and the number, for count checks). Show me one table: Platform | Check | Now | Recommended | Risk.
3. **Apply** only what I approve, then confirm each new state.
4. **Receipt:** at the end, give me a JSON code block in exactly this shape, one item per check:
```json
{"run_at":"<ISO time>","items":[{"id":"google.web_app_activity","platform":"google","module":"settings_sweep","title":"Web & App Activity","status":"changed","before":"on","after":"off"},{"id":"amazon.alexa_voice_history","platform":"amazon","module":"recordings_purge","title":"Alexa voice recordings","status":"changed","count_before":2690,"count_after":0}]}
```
   status is one of: already_ok, changed, skipped, failed, manual, not_found, not_available. For app checks also include "oldest_app" (year) if shown.
5. Tell me to paste that JSON into the "Import" box on the Privacy Sweep page to get my receipt card.

## Checks
### Amazon (Alexa and ads)
_Amazon changed Alexa voice-processing options in 2025 for some Echo devices. Record what options are actually offered._

- **amazon.alexa_voice_history** (recordings_purge, delete, count, risk medium): Alexa voice recordings
  - Go to: https://www.amazon.com/alexa-privacy/apd/rvh
  - Find: The "Review Alexa History" page (Alexa Privacy). Set the date filter to all history and record how many voice recordings are stored. "Delete all history" clears them.
  - Recommended: Delete all recordings
- **amazon.alexa_retention** (settings_sweep, toggle, risk low): Alexa recording retention
  - Go to: https://www.amazon.com/alexa-privacy/apd/myad
  - Find: The "Manage your Alexa data" page, voice recordings section, "Choose how long to save recordings"
  - Recommended: Don't save recordings (or the shortest option offered)
- **amazon.alexa_improve** (settings_sweep, toggle, risk low): Use voice recordings to improve Amazon services
  - Go to: https://www.amazon.com/alexa-privacy/apd/myad
  - Find: On the "Manage Your Alexa Data" page, the "Help improve Alexa" section and its "Use of voice recordings" switch (check any per-family-member switches too)
  - Recommended: off
- **amazon.interest_ads** (settings_sweep, toggle, risk low): Interest-based ads
  - Go to: https://www.amazon.com/adprefs
  - Find: The "Advertising Preferences" choice to show or not show interest-based ads
  - Recommended: Do not show me interest-based ads provided by Amazon

### Global Privacy Control and opt-out of sale
_GPC is a browser signal that California, Colorado, Connecticut, New Jersey and several other US states require businesses to honour as an opt-out of sale/sharing. Opt-out links are usually in the site footer as "Do Not Sell or Share My Personal Information" or "Your Privacy Choices"._

- **dns.gpc_browser** (do_not_sell, manual, risk low): Turn on Global Privacy Control in my everyday browser
  - Go to: n/a
  - Find: Which browser I use day to day
  - Recommended: Firefox: Settings > Privacy & Security > "Tell websites not to sell or share my data". Brave and DuckDuckGo: on by default, confirm. Chrome / Edge: no built-in switch; install the Privacy Sweep extension (v2) or another GPC extension. This changes my own browser, so give me the steps and mark manual.
- **dns.gpc_check** (do_not_sell, manual, risk low): Confirm GPC is being sent
  - Go to: https://globalprivacycontrol.org/
  - Find: The status bar at the top of the page: a green dot with "GPC signal detected." means GPC is on, a red dot means it is not (only meaningful in my everyday browser, not the automation profile)
  - Recommended: Ask me to open the URL in my everyday browser and report what it says
- **dns.site_optout** (do_not_sell, submit_form, count, risk low): Opt-out-of-sale request per site
  - Go to: per_site
  - Find: On each approved site, the footer link "Do Not Sell or Share My Personal Information", "Your Privacy Choices" or similar. Follow it and choose the opt-out.
  - Recommended: Opt out of sale, sharing and targeted advertising. If the form only needs a toggle or email I already have on file there, submit it. If it asks for ID, address, phone or anything new, stop and mark manual. If no link exists, mark not_found.

### GitHub
- **github.oauth_apps** (app_audit, revoke, count, risk low): Authorized OAuth apps
  - Go to: https://github.com/settings/applications
  - Find: The "Authorized OAuth Apps" tab, each app's scopes and last-used date
  - Recommended: Revoke apps unused in 12+ months or with repo/admin scopes I don't need
- **github.github_apps** (app_audit, revoke, count, risk low): Authorized GitHub Apps
  - Go to: https://github.com/settings/apps/authorizations
  - Find: The "Authorized GitHub Apps" list
  - Recommended: Revoke unrecognised or unused
- **github.copilot_training** (settings_sweep, toggle, risk low): Allow GitHub to use my data for product improvement / AI model training
  - Go to: https://github.com/settings/copilot
  - Find: In Copilot settings, the "Allow GitHub to use my data for AI model training" dropdown. Since 24 April 2026 Copilot Free, Pro, Pro+ and Max interactions may be used for training unless I opt out. Business and Enterprise seats may not show it.
  - Recommended: Disabled

### Google
- **google.web_app_activity** (settings_sweep, toggle, risk low): Web & App Activity
  - Go to: https://myactivity.google.com/activitycontrols
  - Find: The "Web & App Activity" control and whether it is On or Off
  - Recommended: Off (or On with auto-delete at 3 months if I want personalised results)
- **google.youtube_history** (settings_sweep, toggle, risk low): YouTube History
  - Go to: https://myactivity.google.com/activitycontrols
  - Find: The "YouTube History" control
  - Recommended: Off, or auto-delete at 3 months
- **google.timeline** (settings_sweep, toggle, risk low): Timeline (Location History)
  - Go to: https://myactivity.google.com/activitycontrols
  - Find: The "Timeline" control (formerly Location History) and whether it is On or Off. Timeline is now saved on each signed-in device, with an optional encrypted cloud backup, so this page may only link to device settings.
  - Recommended: Off. If it is device-only, mark manual and tell me to turn it off in Google Maps on my phone.
- **google.personalized_ads** (settings_sweep, toggle, risk low): Personalised ads
  - Go to: https://myadcenter.google.com/
  - Find: The "Personalised ads" switch
  - Recommended: off
- **google.gemini_activity** (settings_sweep, toggle, risk low): Gemini Apps Activity (used for AI training and human review)
  - Go to: https://myactivity.google.com/product/gemini
  - Find: The "Keep Activity" control near the top of the Gemini Apps Activity page (On or Off). Also reachable in Gemini under Settings & help, then Activity.
  - Recommended: off
- **google.voice_audio** (recordings_purge, delete, count, risk medium): Stored Assistant voice and audio recordings
  - Go to: https://myactivity.google.com/activitycontrols
  - Find: Inside Web & App Activity, the "Include voice and audio activity" option, and the count of saved audio items under Manage activity filtered to Assistant / Voice
  - Recommended: Untick voice and audio, then delete stored audio
  - Offer export first: https://takeout.google.com/
- **google.gemini_chats** (recordings_purge, delete, count, risk medium): Gemini chat history
  - Go to: https://myactivity.google.com/product/gemini
  - Find: The list of saved Gemini activity and its count
  - Recommended: Delete all, then set auto-delete
  - Offer export first: https://takeout.google.com/
- **google.third_party_apps** (app_audit, revoke, count, risk low): Third-party apps and services with account access
  - Go to: https://myaccount.google.com/linkedapps
  - Find: The "Linked apps" page listing each app or service linked to my Google Account. Open each one to see what access it has (for example Gmail read) and any last-used date shown.
  - Recommended: Revoke apps I don't recognise or haven't used in 12+ months

### LinkedIn
- **linkedin.ai_training** (settings_sweep, toggle, risk low): Data for generative AI improvement
  - Go to: https://www.linkedin.com/mypreferences/d/settings/data-for-ai-improvement
  - Find: The "Use my data for training content creation AI models" switch
  - Recommended: off
- **linkedin.ad_data** (settings_sweep, toggle, risk low): Ads using data from outside LinkedIn
  - Go to: https://www.linkedin.com/mypreferences/d/categories/ads
  - Find: Settings & Privacy > Advertising data: the settings under Profile data, Activity and inferred data, and Off LinkedIn data, especially "Ads off LinkedIn" (whether LinkedIn uses data from others to show me ads outside LinkedIn)
  - Recommended: Off for each
- **linkedin.permitted_services** (app_audit, revoke, count, risk low): Permitted services
  - Go to: https://www.linkedin.com/mypreferences/d/permitted-services
  - Find: The list of permitted apps and services
  - Recommended: Remove unrecognised or unused

### Meta (Facebook, Instagram, Meta AI)
- **meta.ad_partner_activity** (settings_sweep, toggle, risk low): Ads and content based on activity from other businesses
  - Go to: https://accountscenter.facebook.com/ads
  - Find: Meta Account (Accounts Center) > Your information and permissions > "Activity from other businesses" (formerly "Activity information from ad partners"). It controls whether Meta uses my activity from other businesses to show me ads and other content.
  - Recommended: No, don't use this activity to personalise my ads or content
- **meta.off_platform_activity** (settings_sweep, toggle, count, risk low): Your activity off Meta technologies
  - Go to: https://accountscenter.facebook.com/info_and_permissions/off_facebook_activity
  - Find: Meta removed this setting in the US and a growing list of countries from July 2026 and folded it into "Activity from other businesses". If the old page still loads in my region, use "Manage future activity" and record how many businesses are listed. If it is gone, mark not_available.
  - Recommended: Disconnect future activity, and clear previous activity
- **meta.ai_training_objection** (settings_sweep, submit_form, risk low): Object to Meta using my information for AI
  - Go to: https://www.facebook.com/privacy/genai
  - Find: A link or form to object to my information being used to develop AI at Meta. Availability depends on region (EU, UK and some others).
  - Recommended: Submit the objection if the form is available. If it is not available in my region, mark not_available and record that.
- **meta.ai_chats** (recordings_purge, delete, count, risk medium): Meta AI chat history
  - Go to: https://www.meta.ai/
  - Find: The chat History list (record the count), then menu > Settings > Data & privacy > Manage your information > "Delete all chats and media". The help page describes the Meta AI app; the web path may differ.
  - Recommended: Delete all
- **meta.apps_and_websites** (app_audit, revoke, count, risk low): Apps and websites logged in with Facebook
  - Go to: https://www.facebook.com/settings?tab=applications
  - Find: The list of active and expired apps and websites, with dates
  - Recommended: Remove apps I don't recognise or haven't used in 12+ months

### Microsoft
- **microsoft.personalized_ads** (settings_sweep, toggle, risk low): Personalised ads and offers
  - Go to: https://account.microsoft.com/privacy/ad-settings
  - Find: On the "Personalized ads & offers" page, the "See ads that interest you" switch (and the separate third-party ad settings, if shown)
  - Recommended: off
- **microsoft.activity_data** (recordings_purge, delete, count, risk medium): Stored activity (browsing, search, location, voice)
  - Go to: https://account.microsoft.com/privacy
  - Find: The privacy dashboard's activity sections (browsing history, search history, location activity, voice) and whether each holds data
  - Recommended: Clear each section that holds data
- **microsoft.connected_apps** (app_audit, revoke, count, risk low): Apps and services with access
  - Go to: https://account.live.com/consent/Manage
  - Find: The list of apps that have permission to access my Microsoft account
  - Recommended: Remove apps I don't recognise or haven't used in 12+ months

### ChatGPT
- **openai.improve_model** (settings_sweep, toggle, risk low): Improve the model for everyone (AI training)
  - Go to: https://chatgpt.com/#settings/DataControls
  - Find: Settings > Data controls > "Improve the model for everyone"
  - Recommended: off
- **openai.chats** (recordings_purge, delete, count, risk high): ChatGPT chat history
  - Go to: https://chatgpt.com/#settings/DataControls
  - Find: The chat history count (sidebar) and the "Delete all chats" option under Settings > Data controls (Archive all chats is in the same place)
  - Recommended: Export first, then delete all chats only if I confirm
  - Offer export first: https://chatgpt.com/#settings/DataControls

### X (Twitter)
- **x.grok_training** (settings_sweep, toggle, risk low): Grok and third-party AI training on my posts
  - Go to: https://x.com/settings/grok_settings
  - Find: Settings > Privacy and safety > Data sharing and personalization > "Grok & Third-party Collaborators": the option allowing my public data and Grok interactions to be used for training and fine-tuning by Grok and third-party collaborators
  - Recommended: off
- **x.personalized_ads** (settings_sweep, toggle, risk low): Personalised ads
  - Go to: https://x.com/settings/ads_preferences
  - Find: The "Personalised ads" switch
  - Recommended: off
- **x.grok_chats** (recordings_purge, delete, risk medium): Grok conversation history
  - Go to: https://x.com/settings/grok_settings
  - Find: On the "Grok & Third-party Collaborators" settings page, the "Delete conversation history" option (Grok history on grok.com is separate)
  - Recommended: Delete
- **x.connected_apps** (app_audit, revoke, count, risk low): Connected apps
  - Go to: https://x.com/settings/connected_apps
  - Find: The list of connected apps with their permissions and approval dates
  - Recommended: Revoke unrecognised or unused
