/* eslint-disable @typescript-eslint/naming-convention -- Generated Supabase types preserve database table and column names. */
/* eslint-disable max-lines -- Keep the generated database contract intact for client type inference. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      academy_plans: {
        Row: {
          active: boolean;
          currency: string;
          duration_minutes: number;
          gift_lessons: number;
          grace_days: number;
          id: string;
          lessons: number;
          price_cents: number;
          validity_days: number;
        };
        Insert: {
          active?: boolean;
          currency?: string;
          duration_minutes?: number;
          gift_lessons?: number;
          grace_days?: number;
          id: string;
          lessons: number;
          price_cents: number;
          validity_days?: number;
        };
        Update: {
          active?: boolean;
          currency?: string;
          duration_minutes?: number;
          gift_lessons?: number;
          grace_days?: number;
          id?: string;
          lessons?: number;
          price_cents?: number;
          validity_days?: number;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          id: string;
          target_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_requests: {
        Row: {
          amount_cents: number;
          created_at: string;
          credit_bucket: string | null;
          currency: string;
          duration_minutes: number;
          funding_source: string;
          id: string;
          lesson_type: string;
          note: string;
          payment_id: string | null;
          payment_status: string;
          scheduled_at: string;
          slot_hold_expires_at: string | null;
          status: string;
          student_id: string;
          subject: string;
          subscription_id: string | null;
          teacher_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          credit_bucket?: string | null;
          currency?: string;
          duration_minutes: number;
          funding_source: string;
          id?: string;
          lesson_type: string;
          note?: string;
          payment_id?: string | null;
          payment_status: string;
          scheduled_at: string;
          slot_hold_expires_at?: string | null;
          status?: string;
          student_id: string;
          subject: string;
          subscription_id?: string | null;
          teacher_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          credit_bucket?: string | null;
          currency?: string;
          duration_minutes?: number;
          funding_source?: string;
          id?: string;
          lesson_type?: string;
          note?: string;
          payment_id?: string | null;
          payment_status?: string;
          scheduled_at?: string;
          slot_hold_expires_at?: string | null;
          status?: string;
          student_id?: string;
          subject?: string;
          subscription_id?: string | null;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_requests_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payment_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_requests_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_requests_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'student_subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_requests_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      coupon_redemptions: {
        Row: {
          coupon_id: string;
          created_at: string;
          id: string;
          payment_id: string;
        };
        Insert: {
          coupon_id: string;
          created_at?: string;
          id?: string;
          payment_id: string;
        };
        Update: {
          coupon_id?: string;
          created_at?: string;
          id?: string;
          payment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'coupon_redemptions_coupon_id_fkey';
            columns: ['coupon_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_discount_coupons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'coupon_redemptions_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: true;
            referencedRelation: 'payment_transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      direct_conversation_user_states: {
        Row: {
          blocked: boolean;
          conversation_id: string;
          hidden_at: string | null;
          last_read_at: string | null;
          user_id: string;
        };
        Insert: {
          blocked?: boolean;
          conversation_id: string;
          hidden_at?: string | null;
          last_read_at?: string | null;
          user_id: string;
        };
        Update: {
          blocked?: boolean;
          conversation_id?: string;
          hidden_at?: string | null;
          last_read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'direct_conversation_user_states_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'direct_conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'direct_conversation_user_states_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      direct_conversations: {
        Row: {
          created_at: string;
          id: string;
          request_status: string;
          requested_by: string;
          student_id: string;
          teacher_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          request_status?: string;
          requested_by: string;
          student_id: string;
          teacher_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          request_status?: string;
          requested_by?: string;
          student_id?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'direct_conversations_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'direct_conversations_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'direct_conversations_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      direct_messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          retracted_at: string | null;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          retracted_at?: string | null;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          retracted_at?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'direct_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'direct_conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'direct_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      earnings_transactions: {
        Row: {
          amount_cents: number;
          created_at: string;
          event_key: string;
          id: string;
          lesson_id: string | null;
          payment_id: string;
          status: string;
          subscription_id: string | null;
          teacher_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          event_key: string;
          id?: string;
          lesson_id?: string | null;
          payment_id: string;
          status: string;
          subscription_id?: string | null;
          teacher_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          event_key?: string;
          id?: string;
          lesson_id?: string | null;
          payment_id?: string;
          status?: string;
          subscription_id?: string | null;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'earnings_transactions_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'earnings_transactions_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payment_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'earnings_transactions_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'student_subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'earnings_transactions_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      lesson_cancellation_requests: {
        Row: {
          created_at: string;
          financial_status: string;
          id: string;
          lesson_id: string;
          note: string;
          requester_id: string;
          responded_at: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          financial_status?: string;
          id?: string;
          lesson_id: string;
          note?: string;
          requester_id: string;
          responded_at?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          financial_status?: string;
          id?: string;
          lesson_id?: string;
          note?: string;
          requester_id?: string;
          responded_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_cancellation_requests_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_cancellation_requests_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_completion_requests: {
        Row: {
          created_at: string;
          id: string;
          lesson_id: string;
          note: string;
          responded_at: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lesson_id: string;
          note?: string;
          responded_at?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lesson_id?: string;
          note?: string;
          responded_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_completion_requests_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_events: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          data: Json;
          id: string;
          lesson_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          lesson_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          lesson_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_events_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          booking_id: string;
          completed_at: string | null;
          created_at: string;
          duration_minutes: number;
          funding_source: string;
          id: string;
          lesson_type: string;
          meeting_url: string | null;
          payment_status: string;
          scheduled_at: string;
          status: string;
          student_id: string;
          subject: string;
          subscription_id: string | null;
          teacher_id: string;
        };
        Insert: {
          booking_id: string;
          completed_at?: string | null;
          created_at?: string;
          duration_minutes: number;
          funding_source: string;
          id?: string;
          lesson_type: string;
          meeting_url?: string | null;
          payment_status: string;
          scheduled_at: string;
          status?: string;
          student_id: string;
          subject: string;
          subscription_id?: string | null;
          teacher_id: string;
        };
        Update: {
          booking_id?: string;
          completed_at?: string | null;
          created_at?: string;
          duration_minutes?: number;
          funding_source?: string;
          id?: string;
          lesson_type?: string;
          meeting_url?: string | null;
          payment_status?: string;
          scheduled_at?: string;
          status?: string;
          student_id?: string;
          subject?: string;
          subscription_id?: string | null;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'booking_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'student_subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          event_key: string;
          id: string;
          kind: string;
          path: string;
          payload: Json;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_key: string;
          id?: string;
          kind: string;
          path: string;
          payload?: Json;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_key?: string;
          id?: string;
          kind?: string;
          path?: string;
          payload?: Json;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          id: string;
          kind: string;
          plan_id: string | null;
          status: string;
          student_id: string;
          subject: string;
          teacher_id: string | null;
          terms: Json;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          id?: string;
          kind: string;
          plan_id?: string | null;
          status?: string;
          student_id: string;
          subject: string;
          teacher_id?: string | null;
          terms: Json;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          kind?: string;
          plan_id?: string | null;
          status?: string;
          student_id?: string;
          subject?: string;
          teacher_id?: string | null;
          terms?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'academy_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      payment_events: {
        Row: {
          created_at: string;
          event_key: string;
          id: string;
          payload: Json;
          payment_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_key: string;
          id?: string;
          payload: Json;
          payment_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_key?: string;
          id?: string;
          payload?: Json;
          payment_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_events_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payment_transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_transactions: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          id: string;
          order_id: string;
          provider_reference: string | null;
          status: string;
          teacher_net_cents: number | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          id?: string;
          order_id: string;
          provider_reference?: string | null;
          status?: string;
          teacher_net_cents?: number | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          order_id?: string;
          provider_reference?: string | null;
          status?: string;
          teacher_net_cents?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_transactions_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      platform_settings: {
        Row: {
          id: boolean;
          meetings_enabled: boolean;
          payments_enabled: boolean;
          teacher_registration_enabled: boolean;
        };
        Insert: {
          id?: boolean;
          meetings_enabled?: boolean;
          payments_enabled?: boolean;
          teacher_registration_enabled?: boolean;
        };
        Update: {
          id?: boolean;
          meetings_enabled?: boolean;
          payments_enabled?: boolean;
          teacher_registration_enabled?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          country: string;
          created_at: string;
          disabled_at: string | null;
          display_name: string;
          id: string;
          locale: string;
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          country?: string;
          created_at?: string;
          disabled_at?: string | null;
          display_name?: string;
          id: string;
          locale?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          country?: string;
          created_at?: string;
          disabled_at?: string | null;
          display_name?: string;
          id?: string;
          locale?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quran_activity_days: {
        Row: {
          date: string;
          id: string;
          manual_pages: number;
          mushaf_id: number;
          page_numbers: number[];
          pages_read: number;
          ranges: string[];
          seconds_read: number;
          user_id: string;
        };
        Insert: {
          date: string;
          id?: string;
          manual_pages?: number;
          mushaf_id?: number;
          page_numbers?: number[];
          pages_read?: number;
          ranges?: string[];
          seconds_read?: number;
          user_id: string;
        };
        Update: {
          date?: string;
          id?: string;
          manual_pages?: number;
          mushaf_id?: number;
          page_numbers?: number[];
          pages_read?: number;
          ranges?: string[];
          seconds_read?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_activity_days_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_bookmarks: {
        Row: {
          created_at: string;
          id: string;
          is_reading: boolean;
          key: number;
          mushaf_id: number;
          type: string;
          user_id: string;
          verse_number: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_reading?: boolean;
          key: number;
          mushaf_id?: number;
          type: string;
          user_id: string;
          verse_number?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_reading?: boolean;
          key?: number;
          mushaf_id?: number;
          type?: string;
          user_id?: string;
          verse_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_bookmarks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_collection_bookmarks: {
        Row: {
          bookmark_id: string;
          collection_id: string;
          user_id: string;
        };
        Insert: {
          bookmark_id: string;
          collection_id: string;
          user_id: string;
        };
        Update: {
          bookmark_id?: string;
          collection_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_collection_bookmarks_bookmark_id_fkey';
            columns: ['bookmark_id'];
            isOneToOne: false;
            referencedRelation: 'quran_bookmarks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quran_collection_bookmarks_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'quran_collections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quran_collection_bookmarks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_collections: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_collections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_goals: {
        Row: {
          category: string;
          created_at: string;
          duration: number | null;
          id: string;
          mushaf_id: number;
          target_amount: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          duration?: number | null;
          id?: string;
          mushaf_id?: number;
          target_amount: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          duration?: number | null;
          id?: string;
          mushaf_id?: number;
          target_amount?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_goals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_note_ranges: {
        Row: {
          note_id: string;
          range: string;
          user_id: string;
        };
        Insert: {
          note_id: string;
          range: string;
          user_id: string;
        };
        Update: {
          note_id?: string;
          range?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_note_ranges_note_id_fkey';
            columns: ['note_id'];
            isOneToOne: false;
            referencedRelation: 'quran_notes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quran_note_ranges_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_notes: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_notes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_pinned_items: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id: string;
          target_type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string;
          target_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_pinned_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_preferences: {
        Row: {
          mushaf_id: number;
          preference_group: string;
          updated_at: string;
          user_id: string;
          value: Json;
        };
        Insert: {
          mushaf_id?: number;
          preference_group: string;
          updated_at?: string;
          user_id: string;
          value: Json;
        };
        Update: {
          mushaf_id?: number;
          preference_group?: string;
          updated_at?: string;
          user_id?: string;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_reading_sessions: {
        Row: {
          chapter_number: number;
          id: string;
          updated_at: string;
          user_id: string;
          verse_number: number;
        };
        Insert: {
          chapter_number: number;
          id?: string;
          updated_at?: string;
          user_id: string;
          verse_number: number;
        };
        Update: {
          chapter_number?: number;
          id?: string;
          updated_at?: string;
          user_id?: string;
          verse_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_reading_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quran_sync_imports: {
        Row: {
          import_key: string;
          imported_at: string;
          user_id: string;
        };
        Insert: {
          import_key: string;
          imported_at?: string;
          user_id: string;
        };
        Update: {
          import_key?: string;
          imported_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quran_sync_imports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          lesson_id: string;
          rating: number;
          student_id: string;
          teacher_id: string;
          visible: boolean;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          lesson_id: string;
          rating: number;
          student_id: string;
          teacher_id: string;
          visible?: boolean;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          rating?: number;
          student_id?: string;
          teacher_id?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: true;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      student_profiles: {
        Row: {
          birth_date: string | null;
          learning_goal: string;
          preferred_schedule: string;
          user_id: string;
        };
        Insert: {
          birth_date?: string | null;
          learning_goal?: string;
          preferred_schedule?: string;
          user_id: string;
        };
        Update: {
          birth_date?: string | null;
          learning_goal?: string;
          preferred_schedule?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_subscriptions: {
        Row: {
          access_ends_at: string;
          duration_minutes: number;
          ends_at: string;
          gift_lessons: number;
          gift_type: string | null;
          id: string;
          included_lessons: number;
          kind: string;
          payment_id: string;
          plan_id: string | null;
          price_cents: number;
          starts_at: string;
          status: string;
          student_id: string;
          subject: string;
          teacher_id: string | null;
        };
        Insert: {
          access_ends_at: string;
          duration_minutes: number;
          ends_at: string;
          gift_lessons?: number;
          gift_type?: string | null;
          id?: string;
          included_lessons: number;
          kind: string;
          payment_id: string;
          plan_id?: string | null;
          price_cents: number;
          starts_at: string;
          status?: string;
          student_id: string;
          subject: string;
          teacher_id?: string | null;
        };
        Update: {
          access_ends_at?: string;
          duration_minutes?: number;
          ends_at?: string;
          gift_lessons?: number;
          gift_type?: string | null;
          id?: string;
          included_lessons?: number;
          kind?: string;
          payment_id?: string;
          plan_id?: string | null;
          price_cents?: number;
          starts_at?: string;
          status?: string;
          student_id?: string;
          subject?: string;
          teacher_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'student_subscriptions_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: true;
            referencedRelation: 'payment_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'academy_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_subscriptions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_subscriptions_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      subscription_credit_ledger: {
        Row: {
          booking_id: string | null;
          bucket: string;
          created_at: string;
          delta: number;
          event_key: string;
          id: string;
          operation: string;
          subscription_id: string;
        };
        Insert: {
          booking_id?: string | null;
          bucket: string;
          created_at?: string;
          delta: number;
          event_key: string;
          id?: string;
          operation: string;
          subscription_id: string;
        };
        Update: {
          booking_id?: string | null;
          bucket?: string;
          created_at?: string;
          delta?: number;
          event_key?: string;
          id?: string;
          operation?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_credit_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_credit_ledger_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'student_subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_approval_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: string;
          reason: string;
          status: string;
          teacher_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          reason?: string;
          status: string;
          teacher_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          reason?: string;
          status?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_approval_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_approval_events_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      teacher_availability: {
        Row: {
          end_time: string;
          id: string;
          start_time: string;
          teacher_id: string;
          weekday: number;
        };
        Insert: {
          end_time: string;
          id?: string;
          start_time: string;
          teacher_id: string;
          weekday: number;
        };
        Update: {
          end_time?: string;
          id?: string;
          start_time?: string;
          teacher_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_availability_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      teacher_discount_coupons: {
        Row: {
          active: boolean;
          code: string;
          expires_at: string | null;
          id: string;
          percent: number;
          teacher_id: string;
          usage_limit: number;
        };
        Insert: {
          active?: boolean;
          code: string;
          expires_at?: string | null;
          id?: string;
          percent: number;
          teacher_id: string;
          usage_limit: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          expires_at?: string | null;
          id?: string;
          percent?: number;
          teacher_id?: string;
          usage_limit?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_discount_coupons_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      teacher_documents: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          path: string;
          teacher_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          path: string;
          teacher_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          path?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_documents_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      teacher_offers: {
        Row: {
          currency: string;
          duration_minutes: number;
          monthly_lessons: number;
          monthly_price_cents: number | null;
          price_cents: number | null;
          pricing: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          currency?: string;
          duration_minutes?: number;
          monthly_lessons?: number;
          monthly_price_cents?: number | null;
          price_cents?: number | null;
          pricing?: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          currency?: string;
          duration_minutes?: number;
          monthly_lessons?: number;
          monthly_price_cents?: number | null;
          price_cents?: number | null;
          pricing?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_offers_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: true;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      teacher_private_contacts: {
        Row: {
          phone: string;
          teacher_id: string;
        };
        Insert: {
          phone?: string;
          teacher_id: string;
        };
        Update: {
          phone?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_private_contacts_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: true;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      teacher_profiles: {
        Row: {
          academy_enabled: boolean;
          approach: Json;
          approval: string;
          avatar_path: string | null;
          biography: Json;
          country: string;
          created_at: string;
          display_name: string;
          display_name_localized: Json;
          experience: number;
          gender: string;
          introduction: Json;
          slug: string;
          specialties: string[];
          teaching_languages: string[];
          updated_at: string;
          user_id: string;
          video_url: string | null;
        };
        Insert: {
          academy_enabled?: boolean;
          approach?: Json;
          approval?: string;
          avatar_path?: string | null;
          biography?: Json;
          country?: string;
          created_at?: string;
          display_name?: string;
          display_name_localized?: Json;
          experience?: number;
          gender?: string;
          introduction?: Json;
          slug: string;
          specialties?: string[];
          teaching_languages?: string[];
          updated_at?: string;
          user_id: string;
          video_url?: string | null;
        };
        Update: {
          academy_enabled?: boolean;
          approach?: Json;
          approval?: string;
          avatar_path?: string | null;
          biography?: Json;
          country?: string;
          created_at?: string;
          display_name?: string;
          display_name_localized?: Json;
          experience?: number;
          gender?: string;
          introduction?: Json;
          slug?: string;
          specialties?: string[];
          teaching_languages?: string[];
          updated_at?: string;
          user_id?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_qualifications: {
        Row: {
          description: Json;
          id: string;
          teacher_id: string;
        };
        Insert: {
          description: Json;
          id?: string;
          teacher_id: string;
        };
        Update: {
          description?: Json;
          id?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_qualifications_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      withdrawal_requests: {
        Row: {
          amount_cents: number;
          created_at: string;
          id: string;
          method: string;
          status: string;
          teacher_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          id?: string;
          method: string;
          status?: string;
          teacher_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          id?: string;
          method?: string;
          status?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'withdrawal_requests_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      tilawa_account_bootstrap: { Args: never; Returns: Json };
      tilawa_account_view: {
        Args: {
          p_id?: string;
          p_page?: number;
          p_status?: string;
          p_view: string;
        };
        Returns: Json;
      };
      tilawa_admin_access: { Args: never; Returns: Json };
      tilawa_admin_finance: {
        Args: {
          p_export?: boolean;
          p_from: string;
          p_kind?: string;
          p_page?: number;
          p_status?: string;
          p_until: string;
        };
        Returns: Json;
      };
      tilawa_admin_health: { Args: never; Returns: Json };
      tilawa_admin_list: {
        Args: {
          p_from?: string;
          p_page?: number;
          p_search?: string;
          p_section: string;
          p_status?: string;
          p_subject?: string;
          p_until?: string;
        };
        Returns: Json;
      };
      tilawa_admin_overview: {
        Args: { p_from: string; p_until: string };
        Returns: Json;
      };
      tilawa_admin_snapshot: { Args: never; Returns: Json };
      tilawa_admin_teacher: { Args: { p_id: string }; Returns: Json };
      tilawa_available_slots: {
        Args: {
          days: number;
          duration: number;
          start_date: string;
          teacher_id: string;
        };
        Returns: Json;
      };
      tilawa_command: {
        Args: { action: string; payload: Json; request_key: string };
        Returns: Json;
      };
      tilawa_goal_count: { Args: { category: string }; Returns: number };
      tilawa_public_teachers: { Args: never; Returns: Json[] };
      tilawa_quran_command: {
        Args: { action: string; payload: Json };
        Returns: Json;
      };
      tilawa_snapshot: { Args: never; Returns: Json };
      tilawa_upload_referenced: {
        Args: { p_bucket: string; p_path: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
  ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
  ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
