import os
import tempfile
import unittest

from pipeline.courses import convert

HEAD = "Date\tCourse\tKeyword\tTitle\tInstructor\tMaterial\tBioc version\tR version\n"


def tsv(*rows):
    fd, path = tempfile.mkstemp(suffix=".tsv")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(HEAD + "".join(r + "\n" for r in rows))
    return path


class Convert(unittest.TestCase):
    def test_groups_by_course_and_keeps_links(self):
        c = convert(tsv(
            "2020-02-20 - 2020-02-20\t[BiocDevelForum](https://youtu.be/b)\tTalk\tB\tX\t[video](https://youtu.be/b)\t3.11\t4.0",
            "2020-01-23 - 2020-01-23\t[BiocDevelForum](https://youtu.be/a)\tTalk\tA\tY\t\t3.11\t4.0",
            "2014-06-22 - 2014-06-28\tCSAMA2014\tRNASeq\tC\tZ\t[pdf](2014/CSAMA2014/c.pdf)\t2.14\t3.1.1",
        ))
        self.assertEqual(sorted(c), ["biocdevelforum", "csama2014"])
        forum = c["biocdevelforum"]
        self.assertEqual(forum["course"], "BiocDevelForum")
        self.assertEqual([s["title"] for s in forum["sessions"]], ["A", "B"], "sorted by date")
        self.assertEqual(forum["sessions"][0]["url"], "https://youtu.be/a")
        self.assertNotIn("url", c["csama2014"]["sessions"][0], "plain course names link by directory")
        self.assertEqual(c["csama2014"]["sessions"][0]["bioc"], "2.14")

    def test_empty_course_names_the_row(self):
        with self.assertRaisesRegex(ValueError, r":2: empty Course"):
            convert(tsv("2017-01-30 - 2017-01-30\t\tOverview\tT\tM\t\t3.4\t3.3"))

    def test_bad_date_names_the_row(self):
        with self.assertRaisesRegex(ValueError, r":2: Date"):
            convert(tsv("2017-01-30\tX\tOverview\tT\tM\t\t3.4\t3.3"))
