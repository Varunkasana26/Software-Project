"""4 small tests for core/eval/merge_labels.py, using tiny inline CSV files."""
import csv
from pathlib import Path

from core.eval.merge_labels import main

CLAUSES = "id,contract_type,perspective,clause_text\nR02,rental,tenant,Tenant pays rent monthly on time.\nR10,rental,tenant,Landlord keeps the deposit as a penalty.\n"
HEADER = "id,category,party_effect,confidence,split_ok,notes\n"


def write(tmp_path: Path, name: str, text: str) -> str:
    path = tmp_path / name
    path.write_text(text, encoding="utf-8")
    return str(path)


def compare(tmp_path, pass1: str, pass2: str, capsys):
    argv = ["compare", write(tmp_path, "p1.csv", pass1), write(tmp_path, "p2.csv", pass2),
            "--clauses", write(tmp_path, "clauses.csv", CLAUSES), "--out-dir", str(tmp_path / "out")]
    code = main(argv)
    return code, capsys.readouterr().out


def rows(path: Path) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def test_full_agreement_prefills_every_final_label(tmp_path, capsys):
    labels = HEADER + "R02,payment_term,neutral,high,y,\nR10,penalty,unfavorable,high,y,\n"
    code, out = compare(tmp_path, labels, labels, capsys)
    merged = rows(tmp_path / "out" / "merged_draft.csv")
    assert code == 0
    assert [r["resolved_by"] for r in merged] == ["agreement", "agreement"]
    assert [r["id"] for r in merged] == ["R02", "R10"]  # natural order: R02 before R10
    assert "category: agreement 2/2 = 100.0%" in out
    assert rows(tmp_path / "out" / "disagreements.csv") == []


def test_disagreement_leaves_final_labels_blank(tmp_path, capsys):
    pass1 = HEADER + "R02,payment_term,neutral,high,y,\nR10,penalty,unfavorable,high,y,\n"
    pass2 = HEADER + "R02,payment_term,neutral,high,y,\nR10,obligation,unfavorable,low,y,\n"
    code, out = compare(tmp_path, pass1, pass2, capsys)
    blank = rows(tmp_path / "out" / "disagreements.csv")
    assert code == 0
    assert [r["id"] for r in blank] == ["R10"]
    assert blank[0]["final_category"] == "" and blank[0]["resolved_by"] == ""
    assert blank[0]["pass1_category"] == "penalty" and blank[0]["pass2_category"] == "obligation"


def test_invalid_value_and_mismatched_ids_are_reported(tmp_path, capsys):
    pass1 = HEADER + "R02,Payment Term,neutral,high,y,\nR10,penalty,unfavorable,high,y,\n"
    pass2 = HEADER + "R02,payment_term,neutral,high,y,\nR99,penalty,unfavorable,high,y,\n"
    code, out = compare(tmp_path, pass1, pass2, capsys)
    assert code == 1
    assert "R02: invalid category 'Payment Term'" in out
    assert "R10: only in pass1" in out and "R99: only in pass2" in out
    assert "R99: has labels but is missing from the clauses file" in out


def test_finalize_refuses_blank_labels_and_lists_the_ids(tmp_path, capsys):
    pass1 = HEADER + "R02,payment_term,neutral,high,y,\nR10,penalty,unfavorable,high,y,\n"
    pass2 = HEADER + "R02,payment_term,neutral,high,y,\nR10,obligation,unfavorable,low,y,\n"
    compare(tmp_path, pass1, pass2, capsys)
    code = main(["finalize", str(tmp_path / "out" / "merged_draft.csv"), "--out-dir", str(tmp_path / "gold")])
    err = capsys.readouterr().err
    assert code == 1
    assert "R10" in err and "R02" not in err
    assert not (tmp_path / "gold" / "gold.json").exists()  # nothing is written when refusing
