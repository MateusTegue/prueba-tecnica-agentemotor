"""Persistence helpers for policy-related queries and writes."""

from __future__ import annotations

import sqlite3
from datetime import date
from typing import Optional


class PolicyRepository:
    @staticmethod
    def fetch_policies(db: sqlite3.Connection, management_status: Optional[str] = None, search: Optional[str] = None):
        query = """
            SELECT 
                p.id,
                p.policy_number,
                p.type,
                p.insurer,
                p.expiration_date,
                p.management_status,
                c.id as client_id,
                c.name as client_name,
                c.phone as client_phone,
                (SELECT COUNT(*) FROM contact_attempts WHERE policy_id = p.id) as contact_attempts_count
            FROM policies p
            JOIN clients c ON p.client_id = c.id
            WHERE 1=1
        """
        params = []

        if management_status:
            query += " AND p.management_status = ?"
            params.append(management_status)

        if search:
            query += " AND (c.name LIKE ? OR p.policy_number LIKE ?)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        return db.execute(query, params).fetchall()

    @staticmethod
    def fetch_policy_detail(db: sqlite3.Connection, policy_id: int):
        query = """
            SELECT 
                p.id,
                p.policy_number,
                p.type,
                p.insurer,
                p.expiration_date,
                p.management_status,
                c.id as client_id,
                c.name as client_name,
                c.phone as client_phone,
                c.email as client_email
            FROM policies p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = ?
        """
        return db.execute(query, (policy_id,)).fetchone()

    @staticmethod
    def fetch_contact_attempts(db: sqlite3.Connection, policy_id: int):
        return db.execute(
            "SELECT id, outcome, notes, created_at FROM contact_attempts WHERE policy_id = ? ORDER BY created_at DESC",
            (policy_id,),
        ).fetchall()

    @staticmethod
    def fetch_policy_for_status_check(db: sqlite3.Connection, policy_id: int):
        return db.execute(
            "SELECT id, expiration_date, management_status FROM policies WHERE id = ?",
            (policy_id,),
        ).fetchone()

    @staticmethod
    def insert_contact_attempt(
        db: sqlite3.Connection,
        policy_id: int,
        outcome: str,
        notes: Optional[str],
        created_at: str,
    ) -> int:
        cursor = db.execute(
            "INSERT INTO contact_attempts (policy_id, outcome, notes, created_at) VALUES (?, ?, ?, ?)",
            (policy_id, outcome, notes, created_at),
        )
        return cursor.lastrowid

    @staticmethod
    def update_policy_management_status(db: sqlite3.Connection, policy_id: int, management_status: str) -> None:
        db.execute(
            "UPDATE policies SET management_status = ? WHERE id = ?",
            (management_status, policy_id),
        )

    @staticmethod
    def update_policy_renewal(db: sqlite3.Connection, policy_id: int, new_expiration_date: date) -> None:
        db.execute(
            "UPDATE policies SET expiration_date = ?, management_status = ? WHERE id = ?",
            (new_expiration_date.isoformat(), "renewed", policy_id),
        )
