from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="domain-finder",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Smart domain name generator with DNS-based availability checking",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/domain-finder",
    project_urls={
        "Bug Tracker": "https://github.com/yourusername/domain-finder/issues",
        "Documentation": "https://github.com/yourusername/domain-finder/blob/main/DOMAIN_FINDER_PROJECT.md",
    },
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Internet :: WWW/HTTP",
    ],
    python_requires=">=3.8",
    install_requires=[
        "dnspython>=2.4.0",
        "click>=8.1.0",
        "pydantic>=2.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "domain-finder=domain_finder.cli:main",
        ],
    },
)
