import { describe, expect, it } from 'vitest';
import { josa } from '../../src/lib/josa.ts';

describe('조사 고르기', () => {
  it('받침 있음·없음', () => {
    expect(josa('급식', 'obj')).toBe('급식을');
    expect(josa('퀴즈', 'obj')).toBe('퀴즈를');
    expect(josa('장보기', 'subj')).toBe('장보기가');
    expect(josa('계산대', 'topic')).toBe('계산대는');
    expect(josa('학생', 'and')).toBe('학생과');
  });

  it('ㄹ받침과 으로/로', () => {
    expect(josa('서울', 'dir')).toBe('서울로');
    expect(josa('학교', 'dir')).toBe('학교로');
    expect(josa('교실', 'dir')).toBe('교실로');
    expect(josa('운동장', 'dir')).toBe('운동장으로');
  });

  it('괄호·기호 뒤에서는 마지막 한글을 본다', () => {
    expect(josa('몇 초~몇 분마다 (실시간)', 'obj')).toBe('몇 초~몇 분마다 (실시간)을');
  });

  it('한글이 없으면 숫자·영문 끝소리로', () => {
    expect(josa('API', 'obj')).toBe('API를');
    expect(josa('HTML', 'obj')).toBe('HTML을');
    expect(josa('3', 'obj')).toBe('3을');
    expect(josa('2', 'obj')).toBe('2를');
  });

  it("영문 끝 'ng'는 ㅇ받침, 'le'는 ㄹ받침으로 (호스팅, 에어테이블)", () => {
    expect(josa('Firebase Hosting', 'dir')).toBe('Firebase Hosting으로');
    expect(josa('Firebase Hosting', 'obj')).toBe('Firebase Hosting을');
    expect(josa('Airtable', 'obj')).toBe('Airtable을');
    expect(josa('Airtable', 'subj')).toBe('Airtable이');
    expect(josa('Airtable', 'dir')).toBe('Airtable로');
    // 'e'로 끝나도 받침이 없는 이름은 그대로
    expect(josa('React + Vite', 'dir')).toBe('React + Vite로');
    expect(josa('Supabase', 'obj')).toBe('Supabase를');
  });

  it('이에요/예요 (추천 이름 알림)', () => {
    expect(josa('Supabase', 'cop')).toBe('Supabase예요');
    expect(josa('나이스 급식식단정보', 'cop')).toBe('나이스 급식식단정보예요');
    expect(josa('Cloud Firestore', 'cop')).toBe('Cloud Firestore예요');
    expect(josa('Firebase Hosting', 'cop')).toBe('Firebase Hosting이에요');
    expect(josa('서울', 'cop')).toBe('서울이에요');
  });

  it('모르면 둘 다 적는다', () => {
    expect(josa('!!', 'obj')).toBe('!!을(를)');
  });
});

import { sentences } from '../../src/lib/sentences.ts';

describe('문장 나누기', () => {
  it('마침표·물음표·느낌표 뒤에서 나눈다', () => {
    expect(sentences('어서 오세요. 어디로 모실까요?')).toEqual(['어서 오세요.', '어디로 모실까요?']);
    expect(sentences("천천히 골라도 돼요. 정하지 못했으면 '아직 모르겠어요'를 누르세요.")).toHaveLength(2);
    expect(sentences('한 문장')).toEqual(['한 문장']);
  });
});
