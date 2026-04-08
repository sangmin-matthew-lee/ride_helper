"use client";
import { useState, useRef, useEffect } from "react";
import { Location, LocationGender, LocationGroup } from "@/types";
import { motion } from "framer-motion";
import styles from "./AddAddressView.module.css";

export type AddressFormVariant = "address" | "rider";

const COPY: Record<
  AddressFormVariant,
  { topTitle: string; step2Desc: string; nickPlaceholder: string }
> = {
  address: {
    topTitle: "새 주소 추가",
    step2Desc: "이 주소의 별명을 정해요",
    nickPlaceholder: "직접 입력 (예: 자바집, 서재집...)",
  },
  rider: {
    topTitle: "새 라이더 등록",
    step2Desc: "이름, 전화번호, 성별을 입력해요",
    nickPlaceholder: "이름 (예: 홍길동, 김팀장...)",
  },
};

interface Props {
  onBack: () => void;
  onSave: (data: Omit<Location, "id">) => Promise<void>;
  checkNicknameDuplicate: (nickname: string) => Promise<boolean>;
  /** 기본값: 주소 등록 */
  variant?: AddressFormVariant;
}

type NicknameCheck = "idle" | "checking" | "available" | "taken";

export default function AddAddressView({
  onBack,
  onSave,
  checkNicknameDuplicate,
  variant = "address",
}: Props) {
  const v = COPY[variant];
  const idp = variant === "rider" ? "rider" : "address";
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<LocationGender | null>(null);
  const [addressGroup, setAddressGroup] = useState<LocationGroup>("fixed");
  const [nicknameCheck, setNicknameCheck] = useState<NicknameCheck>("idle");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (variant === "rider") return;
    const check = () => {
      if (typeof window !== "undefined" && window.google?.maps?.places) {
        setMapsReady(true);
      } else {
        setTimeout(check, 300);
      }
    };
    check();
  }, [variant]);

  useEffect(() => {
    if (variant === "rider") return;
    if (!mapsReady || !inputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      { fields: ["geometry", "formatted_address", "name"] }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        setLat(place.geometry.location.lat());
        setLng(place.geometry.location.lng());
        setAddress(place.formatted_address ?? place.name ?? "");
      }
    });
  }, [mapsReady, variant]);

  const resetNicknameCheck = () => setNicknameCheck("idle");

  const handleCheckDuplicate = async () => {
    const n = nickname.trim();
    if (!n) return;
    if (variant === "address" && lat === null) return;
    setNicknameCheck("checking");
    try {
      const taken = await checkNicknameDuplicate(n);
      setNicknameCheck(taken ? "taken" : "available");
    } catch {
      setNicknameCheck("idle");
      alert("중복 확인 중 오류가 났습니다. 다시 시도해 주세요.");
    }
  };

  const handleSave = async () => {
    if (!nickname.trim() || gender === null) return;
    if (variant === "rider") {
      if (!phone.trim()) {
        alert("전화번호를 입력해 주세요.");
        return;
      }
    } else {
      if (!address || lat === null || lng === null) return;
    }
    if (nicknameCheck !== "available") {
      alert("이름 중복 확인을 먼저 해 주세요.");
      return;
    }
    const taken = await checkNicknameDuplicate(nickname.trim());
    if (taken) {
      setNicknameCheck("taken");
      alert("이미 사용 중인 이름입니다. 다른 이름으로 저장해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const phoneTrim = phone.trim();
      if (variant === "rider") {
        await onSave({
          nickname: nickname.trim(),
          address: "",
          lat: 0,
          lng: 0,
          createdAt: Date.now(),
          gender,
          phone: phoneTrim,
        });
      } else {
        await onSave({
          nickname: nickname.trim(),
          address,
          lat: lat!,
          lng: lng!,
          createdAt: Date.now(),
          gender,
          ...(phoneTrim ? { phone: phoneTrim } : {}),
          ...(variant === "address" ? { group: addressGroup } : {}),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    nickname.trim().length > 0 &&
    gender !== null &&
    nicknameCheck === "available" &&
    (variant === "rider"
      ? phone.trim().length > 0
      : lat !== null && !!address);

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={onBack}
          id={`add-${idp}-back-btn`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>{v.topTitle}</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        {variant === "rider" ? (
          <motion.div
            className={styles.step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepBody}>
              <div className={styles.stepLabel}>라이더 정보</div>
              <p className={styles.stepDesc}>{v.step2Desc}</p>
              <div className={styles.nickRow}>
                <input
                  className={styles.nickInput}
                  placeholder={v.nickPlaceholder}
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    resetNicknameCheck();
                  }}
                  id={`${idp}-nickname-input`}
                />
                <button
                  type="button"
                  className={`btn btn-secondary ${styles.dupBtn}`}
                  onClick={handleCheckDuplicate}
                  disabled={!nickname.trim() || nicknameCheck === "checking"}
                  id={`${idp}-check-nickname-dup-btn`}
                >
                  {nicknameCheck === "checking" ? "확인 중…" : "중복 확인"}
                </button>
              </div>
              {nicknameCheck === "taken" && (
                <p className={styles.dupMsg} role="alert">
                  이미 사용 중인 이름입니다. 다른 이름으로 저장해 주세요.
                </p>
              )}
              {nicknameCheck === "available" && (
                <p className={styles.dupOk}>사용 가능한 이름입니다.</p>
              )}

              <div className={styles.phoneBlock}>
                <label className={styles.phoneLabel} htmlFor={`${idp}-phone-input`}>
                  전화번호
                </label>
                <input
                  id={`${idp}-phone-input`}
                  className={styles.phoneInput}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className={styles.genderBlock}>
                <div className={styles.genderLabel}>성별</div>
                <div className={styles.genderRow}>
                  <label
                    className={`${styles.genderOption} ${gender === "male" ? styles.genderSelected : ""}`}
                  >
                    <input
                      type="radio"
                      name={`${idp}-gender`}
                      checked={gender === "male"}
                      onChange={() => setGender("male")}
                    />
                    <span>남성</span>
                  </label>
                  <label
                    className={`${styles.genderOption} ${gender === "female" ? styles.genderSelected : ""}`}
                  >
                    <input
                      type="radio"
                      name={`${idp}-gender`}
                      checked={gender === "female"}
                      onChange={() => setGender("female")}
                    />
                    <span>여성</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div
              className={styles.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepBody}>
                <div className={styles.stepLabel}>주소 찾기</div>
                <p className={styles.stepDesc}>구글 맵에서 주소를 검색하세요</p>
                <div className={styles.searchWrap}>
                  <div className={styles.searchIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <input
                    ref={inputRef}
                    className={styles.searchInput}
                    placeholder={mapsReady ? "주소 또는 장소 이름 입력..." : "지도 로딩 중..."}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setLat(null);
                      setLng(null);
                    }}
                    disabled={!mapsReady}
                    id={`${idp}-search-input`}
                  />
                  {address && (
                    <button
                      className={styles.clearBtn}
                      type="button"
                      onClick={() => {
                        setAddress("");
                        setLat(null);
                        setLng(null);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>

                {lat !== null ? (
                  <div className={styles.statusPill + " " + styles.statusOk}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                    위치 확인됨
                  </div>
                ) : address.length > 0 ? (
                  <div className={styles.statusPill + " " + styles.statusWarn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                    드롭다운에서 주소를 선택해주세요
                  </div>
                ) : null}
              </div>
            </motion.div>

            <div className={styles.stepDivider} />

            <motion.div
              className={`${styles.step} ${lat === null ? styles.stepDisabled : ""}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className={`${styles.stepNum} ${lat !== null ? styles.stepNumActive : ""}`}>2</div>
              <div className={styles.stepBody}>
                <div className={styles.stepLabel}>이름 붙이기</div>
                <p className={styles.stepDesc}>{v.step2Desc}</p>
                <div className={styles.nickSuggestions}>
                  {["루떠집", "아카집", "교회", "학교", "직장"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.suggestionChip} ${nickname === s ? styles.suggestionActive : ""}`}
                      onClick={() => {
                        setNickname(s);
                        resetNicknameCheck();
                      }}
                      disabled={lat === null}
                      id={`${idp}-suggest-${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className={styles.nickRow}>
                  <input
                    className={styles.nickInput}
                    placeholder={v.nickPlaceholder}
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      resetNicknameCheck();
                    }}
                    disabled={lat === null}
                    id={`${idp}-nickname-input`}
                  />
                  <button
                    type="button"
                    className={`btn btn-secondary ${styles.dupBtn}`}
                    onClick={handleCheckDuplicate}
                    disabled={
                      lat === null || !nickname.trim() || nicknameCheck === "checking"
                    }
                    id={`${idp}-check-nickname-dup-btn`}
                  >
                    {nicknameCheck === "checking" ? "확인 중…" : "중복 확인"}
                  </button>
                </div>
                {nicknameCheck === "taken" && (
                  <p className={styles.dupMsg} role="alert">
                    이미 사용 중인 이름입니다. 다른 이름으로 저장해 주세요.
                  </p>
                )}
                {nicknameCheck === "available" && (
                  <p className={styles.dupOk}>사용 가능한 이름입니다.</p>
                )}

                <div className={styles.phoneBlock}>
                  <label className={styles.phoneLabel} htmlFor={`${idp}-phone-input`}>
                    전화번호
                  </label>
                  <input
                    id={`${idp}-phone-input`}
                    className={styles.phoneInput}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="010-0000-0000 (선택)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={lat === null}
                  />
                </div>

                <div className={styles.genderBlock}>
                  <div className={styles.genderLabel}>성별</div>
                  <div className={styles.genderRow}>
                    <label
                      className={`${styles.genderOption} ${gender === "male" ? styles.genderSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name={`${idp}-gender`}
                        checked={gender === "male"}
                        onChange={() => setGender("male")}
                        disabled={lat === null}
                      />
                      <span>남성</span>
                    </label>
                    <label
                      className={`${styles.genderOption} ${gender === "female" ? styles.genderSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name={`${idp}-gender`}
                        checked={gender === "female"}
                        onChange={() => setGender("female")}
                        disabled={lat === null}
                      />
                      <span>여성</span>
                    </label>
                  </div>
                </div>

                <div className={styles.addrGroupBlock}>
                  <div className={styles.addrGroupLabel}>그룹</div>
                  <div className={styles.genderRow}>
                    <label
                      className={`${styles.genderOption} ${addressGroup === "fixed" ? styles.genderSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name={`${idp}-addr-group`}
                        checked={addressGroup === "fixed"}
                        onChange={() => setAddressGroup("fixed")}
                        disabled={lat === null}
                      />
                      <span>고정</span>
                    </label>
                    <label
                      className={`${styles.genderOption} ${addressGroup === "temporary" ? styles.genderSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name={`${idp}-addr-group`}
                        checked={addressGroup === "temporary"}
                        onChange={() => setAddressGroup("temporary")}
                        disabled={lat === null}
                      />
                      <span>임시</span>
                    </label>
                  </div>
                  <p className={styles.addrGroupHint}>
                    고정은 자주 가는 곳, 임시는 일회성 경유지에 맞춰 골라요
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <motion.div
        className={styles.bottomBar}
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <button
          className={`btn btn-primary ${styles.saveBtn}`}
          onClick={handleSave}
          disabled={!isValid || saving}
          id={`save-${idp}-btn`}
        >
          {saving ? (
            <span className={styles.spinner} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
          )}
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </motion.div>
    </div>
  );
}
