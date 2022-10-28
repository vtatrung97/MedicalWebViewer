module Models {
    export class CreateZoomMeetingModel {
        agenda: string;
        default_password: boolean;
        duration: number;
        password: string;
        pre_schedule: boolean;
        schedule_for: string;
        settings: ZoomMeetingSetting;
        start_time: Date;
        template_id: string;
        timezone: string;
        topic: string;
        tracking_fields: any[];
        type: number;
        constructor() {
            this.default_password = true;
            this.duration = 60;
            this.template_id = "Dv4YdINdTk+Z5RToadh5ug==";
            this.timezone = "Asia/Saigon";
            this.settings = new ZoomMeetingSetting();
        }
    }

    export class ZoomMeetingSetting {
        additional_data_center_regions: string[];
        allow_multiple_devices: boolean;
        alternative_hosts_email_notification: boolean;
        approval_type: number;
        approved_or_denied_countries_or_regions: any;
        audio: string;
        authentication_domains: string;
        authentication_exception: any[];
        authentication_option: string;
        auto_recording: string;
        breakout_room: any;
        calendar_type: number;
        close_registration: boolean;
        contact_email: string;
        contact_name: string;
        email_notification: true;
        encryption_type: string;
        focus_mode: boolean;
        host_video: boolean;
        jbh_time: number;
        join_before_host: boolean;
        language_interpretation: any;
        meeting_authentication: boolean;
        meeting_invitees: any[];
        mute_upon_entry: boolean;
        participant_video: boolean;
        private_meeting: boolean;
        registrants_confirmation_email: boolean;
        registrants_email_notification: boolean;
        registration_type: number;
        show_share_button: boolean;
        use_pmi: boolean;
        waiting_room: boolean;
        waiting_room_options: any;
        watermark: boolean;
        host_save_video_order: boolean;
        alternative_host_update_polls: boolean;
        constructor() {
            this.allow_multiple_devices = true;
            this.alternative_hosts_email_notification = true;
            this.approval_type = 2;
            this.audio = "telephony";
            this.authentication_domains = "example.com";
            this.authentication_exception = [{
                email: "viet@pacs.net.vn",
                name: "Viet Nguyen"
            }];
            this.authentication_option = "signIn_D8cJuqWVQ623CI4Q8yQK0Q";
            this.auto_recording = "cloud";
            this.breakout_room = {
                enable: true,
                rooms: [
                    {
                        name: "room11",
                        participants: ["vietnguyen8392@gmail.com"]
                    }]
            }
            this.calendar_type = 1;
            this.close_registration = false;
            this.contact_email = "viet@pacs.net.vn";
            this.contact_name = "Viet Nguyen";
            this.email_notification = true;
            this.encryption_type = "enhanced_encryption";
            this.focus_mode = true;
            this.host_video = true;
            this.jbh_time = 0;
            this.join_before_host = true;
            this.language_interpretation = {
                enable: true,
                interpreters: [
                    {
                        email: "interpreter@example.com",
                        languages: "US,FR"
                    }]
            };
            this.meeting_authentication = false;
            this.meeting_invitees = [{
                email: "viet@pacs.net.vn"
            }];
            this.mute_upon_entry = false;
            this.participant_video = false;
            this.private_meeting = false;
            this.registrants_confirmation_email = true;
            this.registrants_email_notification = true;
            this.registration_type = 1;
            this.show_share_button = true;
            this.use_pmi = false;
            this.waiting_room = false;
            this.waiting_room_options = {
                enable: false,
                admit_type: 1,
                auto_admit: 1,
                internal_user_auto_admit: 1
            };
            this.watermark = false;
            this.host_save_video_order = true;
            this.alternative_host_update_polls = true;
        }
    }
}