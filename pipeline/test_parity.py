import os
import tempfile
import unittest

from pipeline import parity


def touch(root, rel, text=""):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(text)


class Parity(unittest.TestCase):
    def test_pages_assets_and_downloads(self):
        with tempfile.TemporaryDirectory() as repo:
            touch(repo, "content/about/index.html")
            touch(repo, "content/help/faq.md")
            touch(repo, "content/help/faq.yaml")  # sidecar: no output
            touch(repo, "content/help/events/x.yaml")  # event record: no output
            touch(repo, "content/book/data.zip")
            touch(repo, "content/style/style.sass")  # compiled by nanoc, not copied
            touch(repo, "assets/images/logo.png")
            self.assertEqual(parity.expected(repo), {
                "/about/index.html", "/help/faq/index.html", "/book/data.zip", "/images/logo.png"})
            dist = os.path.join(repo, "dist")
            touch(dist, "about/index.html")
            touch(dist, "images/logo.png")
            self.assertEqual(parity.missing(dist, repo), ["/book/data.zip", "/help/faq/index.html"])
