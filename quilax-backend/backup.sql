--
-- PostgreSQL database dump
--

\restrict 0vwGO00fgfSXxD9yLhYfHZXI9x0F2vrP7Yp7oZpKiMGEpXePZD1h4bXAu2oUyPD

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 18.1 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: imac
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO imac;

--
-- Name: MessageStatus; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."MessageStatus" AS ENUM (
    'NEW',
    'READ',
    'ARCHIVED'
);


ALTER TYPE public."MessageStatus" OWNER TO imac;

--
-- Name: ParticipantStatus; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."ParticipantStatus" AS ENUM (
    'ACTIVE',
    'DISCONNECTED',
    'ELIMINATED',
    'FINISHED'
);


ALTER TYPE public."ParticipantStatus" OWNER TO imac;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO imac;

--
-- Name: QuizPhaseType; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."QuizPhaseType" AS ENUM (
    'PRE_START',
    'QUESTION_READ',
    'QUESTION_ANSWER',
    'QUESTION_CORRECTION',
    'QUESTION_RANKING',
    'FINISHED'
);


ALTER TYPE public."QuizPhaseType" OWNER TO imac;

--
-- Name: QuizStatus; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."QuizStatus" AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'SCHEDULED',
    'PUBLISHED',
    'FINISHED'
);


ALTER TYPE public."QuizStatus" OWNER TO imac;

--
-- Name: RewardRuleType; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."RewardRuleType" AS ENUM (
    'POSITION',
    'RANDOM_MULTI',
    'CREATOR',
    'ADMIN'
);


ALTER TYPE public."RewardRuleType" OWNER TO imac;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN',
    'CREATOR'
);


ALTER TYPE public."Role" OWNER TO imac;

--
-- Name: ScheduleStatus; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."ScheduleStatus" AS ENUM (
    'RESERVED',
    'ACTIVE',
    'COMPLETED'
);


ALTER TYPE public."ScheduleStatus" OWNER TO imac;

--
-- Name: SenderType; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."SenderType" AS ENUM (
    'PLAYER',
    'CREATOR'
);


ALTER TYPE public."SenderType" OWNER TO imac;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."TransactionType" AS ENUM (
    'QUIZ_ENTRY',
    'PRIZE_PAYOUT',
    'PLATFORM_FEE',
    'WITHDRAW'
);


ALTER TYPE public."TransactionType" OWNER TO imac;

--
-- Name: WinnerType; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."WinnerType" AS ENUM (
    'TOP',
    'RANDOM'
);


ALTER TYPE public."WinnerType" OWNER TO imac;

--
-- Name: WithdrawStatus; Type: TYPE; Schema: public; Owner: imac
--

CREATE TYPE public."WithdrawStatus" AS ENUM (
    'REQUESTED',
    'PROCESSING',
    'COMPLETED',
    'REJECTED'
);


ALTER TYPE public."WithdrawStatus" OWNER TO imac;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."Message" (
    id integer NOT NULL,
    "senderId" integer NOT NULL,
    "senderType" public."SenderType" NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    status public."MessageStatus" DEFAULT 'NEW'::public."MessageStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Message" OWNER TO imac;

--
-- Name: Message_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."Message_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Message_id_seq" OWNER TO imac;

--
-- Name: Message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."Message_id_seq" OWNED BY public."Message".id;


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."Payment" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    amount integer NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    status public."PaymentStatus" NOT NULL,
    "stripeRef" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Payment" OWNER TO imac;

--
-- Name: Payment_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."Payment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Payment_id_seq" OWNER TO imac;

--
-- Name: Payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."Payment_id_seq" OWNED BY public."Payment".id;


--
-- Name: PremiumSubscription; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."PremiumSubscription" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PremiumSubscription" OWNER TO imac;

--
-- Name: PremiumSubscription_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."PremiumSubscription_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PremiumSubscription_id_seq" OWNER TO imac;

--
-- Name: PremiumSubscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."PremiumSubscription_id_seq" OWNED BY public."PremiumSubscription".id;


--
-- Name: Quiz; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."Quiz" (
    id integer NOT NULL,
    title text NOT NULL,
    "requestedDate" timestamp(3) without time zone NOT NULL,
    credits double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "creatorId" integer NOT NULL,
    status public."QuizStatus" DEFAULT 'PENDING_REVIEW'::public."QuizStatus" NOT NULL
);


ALTER TABLE public."Quiz" OWNER TO imac;

--
-- Name: QuizAnswer; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."QuizAnswer" (
    id integer NOT NULL,
    "quizRunId" integer NOT NULL,
    "questionId" integer NOT NULL,
    "userId" integer NOT NULL,
    answer text NOT NULL,
    "isCorrect" boolean NOT NULL,
    points integer NOT NULL,
    "answeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);


ALTER TABLE public."QuizAnswer" OWNER TO imac;

--
-- Name: QuizAnswer_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."QuizAnswer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."QuizAnswer_id_seq" OWNER TO imac;

--
-- Name: QuizAnswer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."QuizAnswer_id_seq" OWNED BY public."QuizAnswer".id;


--
-- Name: QuizEnrollment; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."QuizEnrollment" (
    id integer NOT NULL,
    "quizId" integer NOT NULL,
    "userId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."QuizEnrollment" OWNER TO imac;

--
-- Name: QuizEnrollment_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."QuizEnrollment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."QuizEnrollment_id_seq" OWNER TO imac;

--
-- Name: QuizEnrollment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."QuizEnrollment_id_seq" OWNED BY public."QuizEnrollment".id;


--
-- Name: QuizParticipant; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."QuizParticipant" (
    id integer NOT NULL,
    "quizRunId" integer NOT NULL,
    "userId" integer NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."ParticipantStatus" DEFAULT 'ACTIVE'::public."ParticipantStatus" NOT NULL
);


ALTER TABLE public."QuizParticipant" OWNER TO imac;

--
-- Name: QuizParticipant_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."QuizParticipant_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."QuizParticipant_id_seq" OWNER TO imac;

--
-- Name: QuizParticipant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."QuizParticipant_id_seq" OWNED BY public."QuizParticipant".id;


--
-- Name: QuizQuestion; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."QuizQuestion" (
    id integer NOT NULL,
    "quizId" integer NOT NULL,
    text text NOT NULL,
    "correctAnswer" text NOT NULL,
    "maxPoints" integer NOT NULL,
    "answerTime" integer NOT NULL,
    "readTime" integer NOT NULL
);


ALTER TABLE public."QuizQuestion" OWNER TO imac;

--
-- Name: QuizQuestion_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."QuizQuestion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."QuizQuestion_id_seq" OWNER TO imac;

--
-- Name: QuizQuestion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."QuizQuestion_id_seq" OWNED BY public."QuizQuestion".id;


--
-- Name: QuizRun; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."QuizRun" (
    id integer NOT NULL,
    "quizId" integer NOT NULL,
    phase public."QuizPhaseType" NOT NULL,
    "currentIndex" integer DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "phaseEndsAt" timestamp(3) without time zone,
    "finishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "totalPrizeCredits" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."QuizRun" OWNER TO imac;

--
-- Name: QuizRun_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."QuizRun_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."QuizRun_id_seq" OWNER TO imac;

--
-- Name: QuizRun_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."QuizRun_id_seq" OWNED BY public."QuizRun".id;


--
-- Name: QuizSchedule; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."QuizSchedule" (
    id integer NOT NULL,
    "quizId" integer NOT NULL,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    status public."ScheduleStatus" DEFAULT 'RESERVED'::public."ScheduleStatus" NOT NULL
);


ALTER TABLE public."QuizSchedule" OWNER TO imac;

--
-- Name: QuizSchedule_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."QuizSchedule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."QuizSchedule_id_seq" OWNER TO imac;

--
-- Name: QuizSchedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."QuizSchedule_id_seq" OWNED BY public."QuizSchedule".id;


--
-- Name: QuizScore; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."QuizScore" (
    id integer NOT NULL,
    "quizRunId" integer NOT NULL,
    "userId" integer NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    "answeredAt" timestamp(3) without time zone
);


ALTER TABLE public."QuizScore" OWNER TO imac;

--
-- Name: QuizScore_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."QuizScore_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."QuizScore_id_seq" OWNER TO imac;

--
-- Name: QuizScore_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."QuizScore_id_seq" OWNED BY public."QuizScore".id;


--
-- Name: QuizWinner; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."QuizWinner" (
    id integer NOT NULL,
    "quizId" integer NOT NULL,
    "userId" integer NOT NULL,
    percent double precision NOT NULL,
    "creditsWon" double precision NOT NULL,
    type public."WinnerType" DEFAULT 'RANDOM'::public."WinnerType" NOT NULL
);


ALTER TABLE public."QuizWinner" OWNER TO imac;

--
-- Name: QuizWinner_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."QuizWinner_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."QuizWinner_id_seq" OWNER TO imac;

--
-- Name: QuizWinner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."QuizWinner_id_seq" OWNED BY public."QuizWinner".id;


--
-- Name: Quiz_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."Quiz_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Quiz_id_seq" OWNER TO imac;

--
-- Name: Quiz_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."Quiz_id_seq" OWNED BY public."Quiz".id;


--
-- Name: RewardRule; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."RewardRule" (
    id integer NOT NULL,
    "quizId" integer NOT NULL,
    type public."RewardRuleType" NOT NULL,
    "position" integer,
    "winnersCount" integer,
    percent double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RewardRule" OWNER TO imac;

--
-- Name: RewardRule_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."RewardRule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RewardRule_id_seq" OWNER TO imac;

--
-- Name: RewardRule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."RewardRule_id_seq" OWNED BY public."RewardRule".id;


--
-- Name: Season; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."Season" (
    id integer NOT NULL,
    name text NOT NULL,
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Season" OWNER TO imac;

--
-- Name: SeasonUser; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."SeasonUser" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "seasonId" integer NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SeasonUser" OWNER TO imac;

--
-- Name: SeasonUser_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."SeasonUser_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SeasonUser_id_seq" OWNER TO imac;

--
-- Name: SeasonUser_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."SeasonUser_id_seq" OWNED BY public."SeasonUser".id;


--
-- Name: SeasonWinner; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."SeasonWinner" (
    id integer NOT NULL,
    "seasonId" integer NOT NULL,
    "userId" integer NOT NULL,
    type public."WinnerType" NOT NULL,
    reward text,
    "position" integer,
    points integer NOT NULL,
    "pointsAwarded" integer,
    "rewardDescription" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SeasonWinner" OWNER TO imac;

--
-- Name: SeasonWinner_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."SeasonWinner_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SeasonWinner_id_seq" OWNER TO imac;

--
-- Name: SeasonWinner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."SeasonWinner_id_seq" OWNED BY public."SeasonWinner".id;


--
-- Name: Season_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."Season_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Season_id_seq" OWNER TO imac;

--
-- Name: Season_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."Season_id_seq" OWNED BY public."Season".id;


--
-- Name: SystemSettings; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."SystemSettings" (
    id integer NOT NULL,
    "maxQuizzesPerMinute" integer DEFAULT 1 NOT NULL,
    "maxQuizzesPerHour" integer DEFAULT 60 NOT NULL,
    "defaultMaxPointsPerQuestion" integer DEFAULT 1000 NOT NULL,
    "pointsDecayPerSecond" integer DEFAULT 10 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemSettings" OWNER TO imac;

--
-- Name: SystemSettings_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."SystemSettings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SystemSettings_id_seq" OWNER TO imac;

--
-- Name: SystemSettings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."SystemSettings_id_seq" OWNED BY public."SystemSettings".id;


--
-- Name: Transaction; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."Transaction" (
    id integer NOT NULL,
    "userId" integer,
    "quizId" integer,
    type public."TransactionType" NOT NULL,
    amount double precision NOT NULL,
    currency text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Transaction" OWNER TO imac;

--
-- Name: Transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."Transaction_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Transaction_id_seq" OWNER TO imac;

--
-- Name: Transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."Transaction_id_seq" OWNED BY public."Transaction".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    password text,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    "lockedBalance" double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public."User" OWNER TO imac;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO imac;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: Withdraw; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public."Withdraw" (
    id integer NOT NULL,
    amount double precision NOT NULL,
    currency text NOT NULL,
    status public."WithdrawStatus" DEFAULT 'REQUESTED'::public."WithdrawStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Withdraw" OWNER TO imac;

--
-- Name: Withdraw_id_seq; Type: SEQUENCE; Schema: public; Owner: imac
--

CREATE SEQUENCE public."Withdraw_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Withdraw_id_seq" OWNER TO imac;

--
-- Name: Withdraw_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imac
--

ALTER SEQUENCE public."Withdraw_id_seq" OWNED BY public."Withdraw".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: imac
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO imac;

--
-- Name: Message id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Message" ALTER COLUMN id SET DEFAULT nextval('public."Message_id_seq"'::regclass);


--
-- Name: Payment id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Payment" ALTER COLUMN id SET DEFAULT nextval('public."Payment_id_seq"'::regclass);


--
-- Name: PremiumSubscription id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."PremiumSubscription" ALTER COLUMN id SET DEFAULT nextval('public."PremiumSubscription_id_seq"'::regclass);


--
-- Name: Quiz id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Quiz" ALTER COLUMN id SET DEFAULT nextval('public."Quiz_id_seq"'::regclass);


--
-- Name: QuizAnswer id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizAnswer" ALTER COLUMN id SET DEFAULT nextval('public."QuizAnswer_id_seq"'::regclass);


--
-- Name: QuizEnrollment id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizEnrollment" ALTER COLUMN id SET DEFAULT nextval('public."QuizEnrollment_id_seq"'::regclass);


--
-- Name: QuizParticipant id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizParticipant" ALTER COLUMN id SET DEFAULT nextval('public."QuizParticipant_id_seq"'::regclass);


--
-- Name: QuizQuestion id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizQuestion" ALTER COLUMN id SET DEFAULT nextval('public."QuizQuestion_id_seq"'::regclass);


--
-- Name: QuizRun id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizRun" ALTER COLUMN id SET DEFAULT nextval('public."QuizRun_id_seq"'::regclass);


--
-- Name: QuizSchedule id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizSchedule" ALTER COLUMN id SET DEFAULT nextval('public."QuizSchedule_id_seq"'::regclass);


--
-- Name: QuizScore id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizScore" ALTER COLUMN id SET DEFAULT nextval('public."QuizScore_id_seq"'::regclass);


--
-- Name: QuizWinner id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizWinner" ALTER COLUMN id SET DEFAULT nextval('public."QuizWinner_id_seq"'::regclass);


--
-- Name: RewardRule id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."RewardRule" ALTER COLUMN id SET DEFAULT nextval('public."RewardRule_id_seq"'::regclass);


--
-- Name: Season id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Season" ALTER COLUMN id SET DEFAULT nextval('public."Season_id_seq"'::regclass);


--
-- Name: SeasonUser id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SeasonUser" ALTER COLUMN id SET DEFAULT nextval('public."SeasonUser_id_seq"'::regclass);


--
-- Name: SeasonWinner id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SeasonWinner" ALTER COLUMN id SET DEFAULT nextval('public."SeasonWinner_id_seq"'::regclass);


--
-- Name: SystemSettings id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SystemSettings" ALTER COLUMN id SET DEFAULT nextval('public."SystemSettings_id_seq"'::regclass);


--
-- Name: Transaction id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Transaction" ALTER COLUMN id SET DEFAULT nextval('public."Transaction_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: Withdraw id; Type: DEFAULT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Withdraw" ALTER COLUMN id SET DEFAULT nextval('public."Withdraw_id_seq"'::regclass);


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."Message" (id, "senderId", "senderType", subject, content, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."Payment" (id, "userId", amount, currency, status, "stripeRef", "createdAt") FROM stdin;
\.


--
-- Data for Name: PremiumSubscription; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."PremiumSubscription" (id, "userId", "startsAt", "endsAt", active, "createdAt") FROM stdin;
\.


--
-- Data for Name: Quiz; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."Quiz" (id, title, "requestedDate", credits, "createdAt", "creatorId", status) FROM stdin;
\.


--
-- Data for Name: QuizAnswer; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."QuizAnswer" (id, "quizRunId", "questionId", "userId", answer, "isCorrect", points, "answeredAt", "ipAddress", "userAgent") FROM stdin;
\.


--
-- Data for Name: QuizEnrollment; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."QuizEnrollment" (id, "quizId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: QuizParticipant; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."QuizParticipant" (id, "quizRunId", "userId", "joinedAt", status) FROM stdin;
\.


--
-- Data for Name: QuizQuestion; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."QuizQuestion" (id, "quizId", text, "correctAnswer", "maxPoints", "answerTime", "readTime") FROM stdin;
\.


--
-- Data for Name: QuizRun; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."QuizRun" (id, "quizId", phase, "currentIndex", "startedAt", "phaseEndsAt", "finishedAt", "createdAt", "totalPrizeCredits") FROM stdin;
\.


--
-- Data for Name: QuizSchedule; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."QuizSchedule" (id, "quizId", "scheduledAt", status) FROM stdin;
\.


--
-- Data for Name: QuizScore; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."QuizScore" (id, "quizRunId", "userId", score, "answeredAt") FROM stdin;
\.


--
-- Data for Name: QuizWinner; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."QuizWinner" (id, "quizId", "userId", percent, "creditsWon", type) FROM stdin;
\.


--
-- Data for Name: RewardRule; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."RewardRule" (id, "quizId", type, "position", "winnersCount", percent, "createdAt") FROM stdin;
\.


--
-- Data for Name: Season; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."Season" (id, name, "startsAt", "endsAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: SeasonUser; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."SeasonUser" (id, "userId", "seasonId", points, "createdAt") FROM stdin;
\.


--
-- Data for Name: SeasonWinner; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."SeasonWinner" (id, "seasonId", "userId", type, reward, "position", points, "pointsAwarded", "rewardDescription", "createdAt") FROM stdin;
\.


--
-- Data for Name: SystemSettings; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."SystemSettings" (id, "maxQuizzesPerMinute", "maxQuizzesPerHour", "defaultMaxPointsPerQuestion", "pointsDecayPerSecond", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."Transaction" (id, "userId", "quizId", type, amount, currency, "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."User" (id, email, password, role, points, "createdAt", balance, "lockedBalance") FROM stdin;
\.


--
-- Data for Name: Withdraw; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public."Withdraw" (id, amount, currency, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: imac
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
13756cec-3506-4c3d-aa36-474e30d0ea42	1ad01c105a40ed1811d2cd8cf50b33eadda5185c12defec518afbdfaa7dcc58b	2026-02-18 16:50:10.733182+01	20260111165252_reset_after_schema_fix	\N	\N	2026-02-18 16:50:10.613747+01	1
e87297be-4d22-4989-96e2-e4ae063422a5	aa2608454c111bd51c96060c30a930b07c4204966ac6bac5de68acf892d1b62c	2026-02-18 16:50:10.806843+01	20260113175633_add_admin_models	\N	\N	2026-02-18 16:50:10.734151+01	1
52e74255-bb77-4a7d-b776-78096fbdf2b0	0efca6fd73d1d8fff60227fcf5ccdeeef98843bb8c31fe8192d1c3269b0403cd	2026-02-18 16:50:10.820858+01	20260115215415_add_quiz_answers	\N	\N	2026-02-18 16:50:10.807676+01	1
37a99d6f-27dc-4fce-bdfe-d426a37f41ab	f14655b7b30fbe8623acaa5c1d9992b13712aa5d4ab197daf55966fffc3d426c	2026-02-18 16:50:10.823759+01	20260205114740_make_phase_ends_at_optional	\N	\N	2026-02-18 16:50:10.821577+01	1
8422746b-3ce1-48b5-a049-ad1951400a35	41ef404d3c18f59482a5aba12d5afd40580601b7574678ff10c03121a885209a	2026-02-18 16:50:10.831533+01	20260211185141_add_participants_balance_antifraud	\N	\N	2026-02-18 16:50:10.824426+01	1
c604ca31-ea20-419d-8c69-92059fab924c	4f268eebeb1b60615fd6b03349793beefa4ebd6ea19f960821cd9a473fe5638c	2026-02-18 16:50:10.839202+01	20260214103420_add_quiz_enrollment	\N	\N	2026-02-18 16:50:10.832467+01	1
c5ac8f88-ac9c-450f-b1d3-b31337095275	c7dd18d97989fae43363c5ee68769df607be5d9c42cc314a5bab2b2b1713c8df	2026-02-18 16:50:10.846058+01	20260214131509_add_reward_rules	\N	\N	2026-02-18 16:50:10.840235+01	1
04467e1b-c11e-4592-8953-717f8b954f5b	b8832bc9bef56ed4bfc3b561776c4a177210dad0a5e407e5dd45051fd7eed9b0	2026-02-18 16:50:10.850131+01	20260215192806_add_total_prize_cache	\N	\N	2026-02-18 16:50:10.847005+01	1
af9034a7-9b63-42f0-a0da-33c080948b4b	f30b2d9a70c0803270aa99989f3673cd417f891ec8c80a710d4c1de5b087c171	2026-02-18 16:50:10.853889+01	20260215193053_add_jackpot_system	\N	\N	2026-02-18 16:50:10.850886+01	1
b528c3fe-f1a9-446f-85a7-107753d7fe14	eb3940c807c311d3716724d3ee6fcd1e0d0d5e6ada8a27b031f220d293a97086	2026-02-18 16:59:07.792628+01	20260218155907_remove_jackpot	\N	\N	2026-02-18 16:59:07.61826+01	1
d22b34f8-ff98-49d3-b975-cb3beefcf83a	2a06f611b4acbe5ca1fa942c3301204e5d503eea2b9d13ef5c6f4a164fa59132	2026-02-25 22:38:28.629933+01	20260225213828_add_locked_balance	\N	\N	2026-02-25 22:38:28.455541+01	1
\.


--
-- Name: Message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."Message_id_seq"', 1, false);


--
-- Name: Payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."Payment_id_seq"', 1, false);


--
-- Name: PremiumSubscription_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."PremiumSubscription_id_seq"', 1, false);


--
-- Name: QuizAnswer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."QuizAnswer_id_seq"', 1, false);


--
-- Name: QuizEnrollment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."QuizEnrollment_id_seq"', 1, false);


--
-- Name: QuizParticipant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."QuizParticipant_id_seq"', 1, false);


--
-- Name: QuizQuestion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."QuizQuestion_id_seq"', 1, false);


--
-- Name: QuizRun_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."QuizRun_id_seq"', 1, false);


--
-- Name: QuizSchedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."QuizSchedule_id_seq"', 1, false);


--
-- Name: QuizScore_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."QuizScore_id_seq"', 1, false);


--
-- Name: QuizWinner_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."QuizWinner_id_seq"', 1, false);


--
-- Name: Quiz_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."Quiz_id_seq"', 1, false);


--
-- Name: RewardRule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."RewardRule_id_seq"', 1, false);


--
-- Name: SeasonUser_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."SeasonUser_id_seq"', 1, false);


--
-- Name: SeasonWinner_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."SeasonWinner_id_seq"', 1, false);


--
-- Name: Season_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."Season_id_seq"', 1, false);


--
-- Name: SystemSettings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."SystemSettings_id_seq"', 1, false);


--
-- Name: Transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."Transaction_id_seq"', 1, false);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."User_id_seq"', 1, false);


--
-- Name: Withdraw_id_seq; Type: SEQUENCE SET; Schema: public; Owner: imac
--

SELECT pg_catalog.setval('public."Withdraw_id_seq"', 1, false);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PremiumSubscription PremiumSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."PremiumSubscription"
    ADD CONSTRAINT "PremiumSubscription_pkey" PRIMARY KEY (id);


--
-- Name: QuizAnswer QuizAnswer_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizAnswer"
    ADD CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY (id);


--
-- Name: QuizEnrollment QuizEnrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizEnrollment"
    ADD CONSTRAINT "QuizEnrollment_pkey" PRIMARY KEY (id);


--
-- Name: QuizParticipant QuizParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizParticipant"
    ADD CONSTRAINT "QuizParticipant_pkey" PRIMARY KEY (id);


--
-- Name: QuizQuestion QuizQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizQuestion"
    ADD CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY (id);


--
-- Name: QuizRun QuizRun_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizRun"
    ADD CONSTRAINT "QuizRun_pkey" PRIMARY KEY (id);


--
-- Name: QuizSchedule QuizSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizSchedule"
    ADD CONSTRAINT "QuizSchedule_pkey" PRIMARY KEY (id);


--
-- Name: QuizScore QuizScore_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizScore"
    ADD CONSTRAINT "QuizScore_pkey" PRIMARY KEY (id);


--
-- Name: QuizWinner QuizWinner_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizWinner"
    ADD CONSTRAINT "QuizWinner_pkey" PRIMARY KEY (id);


--
-- Name: Quiz Quiz_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Quiz"
    ADD CONSTRAINT "Quiz_pkey" PRIMARY KEY (id);


--
-- Name: RewardRule RewardRule_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."RewardRule"
    ADD CONSTRAINT "RewardRule_pkey" PRIMARY KEY (id);


--
-- Name: SeasonUser SeasonUser_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SeasonUser"
    ADD CONSTRAINT "SeasonUser_pkey" PRIMARY KEY (id);


--
-- Name: SeasonWinner SeasonWinner_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SeasonWinner"
    ADD CONSTRAINT "SeasonWinner_pkey" PRIMARY KEY (id);


--
-- Name: Season Season_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Season"
    ADD CONSTRAINT "Season_pkey" PRIMARY KEY (id);


--
-- Name: SystemSettings SystemSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SystemSettings"
    ADD CONSTRAINT "SystemSettings_pkey" PRIMARY KEY (id);


--
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Withdraw Withdraw_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Withdraw"
    ADD CONSTRAINT "Withdraw_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Payment_stripeRef_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "Payment_stripeRef_key" ON public."Payment" USING btree ("stripeRef");


--
-- Name: PremiumSubscription_userId_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "PremiumSubscription_userId_key" ON public."PremiumSubscription" USING btree ("userId");


--
-- Name: QuizAnswer_quizRunId_questionId_userId_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "QuizAnswer_quizRunId_questionId_userId_key" ON public."QuizAnswer" USING btree ("quizRunId", "questionId", "userId");


--
-- Name: QuizEnrollment_quizId_userId_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "QuizEnrollment_quizId_userId_key" ON public."QuizEnrollment" USING btree ("quizId", "userId");


--
-- Name: QuizParticipant_quizRunId_userId_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "QuizParticipant_quizRunId_userId_key" ON public."QuizParticipant" USING btree ("quizRunId", "userId");


--
-- Name: QuizScore_quizRunId_userId_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "QuizScore_quizRunId_userId_key" ON public."QuizScore" USING btree ("quizRunId", "userId");


--
-- Name: SeasonUser_userId_seasonId_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "SeasonUser_userId_seasonId_key" ON public."SeasonUser" USING btree ("userId", "seasonId");


--
-- Name: SeasonWinner_seasonId_userId_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "SeasonWinner_seasonId_userId_key" ON public."SeasonWinner" USING btree ("seasonId", "userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: imac
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Message Message_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PremiumSubscription PremiumSubscription_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."PremiumSubscription"
    ADD CONSTRAINT "PremiumSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizAnswer QuizAnswer_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizAnswer"
    ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."QuizQuestion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizAnswer QuizAnswer_quizRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizAnswer"
    ADD CONSTRAINT "QuizAnswer_quizRunId_fkey" FOREIGN KEY ("quizRunId") REFERENCES public."QuizRun"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizAnswer QuizAnswer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizAnswer"
    ADD CONSTRAINT "QuizAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizEnrollment QuizEnrollment_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizEnrollment"
    ADD CONSTRAINT "QuizEnrollment_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizEnrollment QuizEnrollment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizEnrollment"
    ADD CONSTRAINT "QuizEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizParticipant QuizParticipant_quizRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizParticipant"
    ADD CONSTRAINT "QuizParticipant_quizRunId_fkey" FOREIGN KEY ("quizRunId") REFERENCES public."QuizRun"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizParticipant QuizParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizParticipant"
    ADD CONSTRAINT "QuizParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizQuestion QuizQuestion_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizQuestion"
    ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizRun QuizRun_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizRun"
    ADD CONSTRAINT "QuizRun_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizSchedule QuizSchedule_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizSchedule"
    ADD CONSTRAINT "QuizSchedule_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizScore QuizScore_quizRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizScore"
    ADD CONSTRAINT "QuizScore_quizRunId_fkey" FOREIGN KEY ("quizRunId") REFERENCES public."QuizRun"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizScore QuizScore_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizScore"
    ADD CONSTRAINT "QuizScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizWinner QuizWinner_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizWinner"
    ADD CONSTRAINT "QuizWinner_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizWinner QuizWinner_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."QuizWinner"
    ADD CONSTRAINT "QuizWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Quiz Quiz_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Quiz"
    ADD CONSTRAINT "Quiz_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RewardRule RewardRule_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."RewardRule"
    ADD CONSTRAINT "RewardRule_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SeasonUser SeasonUser_seasonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SeasonUser"
    ADD CONSTRAINT "SeasonUser_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES public."Season"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SeasonUser SeasonUser_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SeasonUser"
    ADD CONSTRAINT "SeasonUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SeasonWinner SeasonWinner_seasonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SeasonWinner"
    ADD CONSTRAINT "SeasonWinner_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES public."Season"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SeasonWinner SeasonWinner_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."SeasonWinner"
    ADD CONSTRAINT "SeasonWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Transaction Transaction_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imac
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: imac
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 0vwGO00fgfSXxD9yLhYfHZXI9x0F2vrP7Yp7oZpKiMGEpXePZD1h4bXAu2oUyPD

