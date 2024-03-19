let courses = {
    "02:256:111": {
        "name": "Calculus I",
        "description": "Introduction to differential calculus, including limits, derivatives, and applications.",
        "credits": 4,
        "prereqs": [],
        "correqs": []
    },
    "02:256:112": {
        "name": "Calculus II",
        "description": "Continuation of Calculus I, including techniques of integration, applications of integrals, and series.",
        "credits": 4,
        "prereqs": ["02:256:111"],
        "correqs": ["02:256:203"]
    },
    "02:256:203": {
        "name": "Calculus II Lab",
        "description": "Lab component for Calculus II covering practical applications of integration and series.",
        "credits": 1,
        "prereqs": [],
        "correqs": []
    },
    "02:256:116": {
        "name": "Differential Equations",
        "description": "Introduction to ordinary differential equations, including methods of solution and applications.",
        "credits": 3,
        "prereqs": ["02:256:112", "02:256:117"],
        "correqs": ["02:256:204"]
    },
    "02:256:204": {
        "name": "Differential Equations Lab",
        "description": "Lab component for Differential Equations covering numerical methods and computer applications.",
        "credits": 1,
        "prereqs": [],
        "correqs": []
    },
    "02:256:117": {
        "name": "Real Analysis",
        "description": "Introduction to real analysis, including properties of real numbers, sequences, and series.",
        "credits": 3,
        "prereqs": ["02:256:112"],
        "correqs": ["02:256:205"]
    },
    "02:256:205": {
        "name": "Real Analysis Lab",
        "description": "Lab component for Real Analysis covering proofs and applications.",
        "credits": 1,
        "prereqs": [],
        "correqs": []
    },
    "02:256:121": {
        "name": "Mathematical Logic",
        "description": "Introduction to propositional and predicate logic, with applications to mathematics and computer science.",
        "credits": 3,
        "prereqs": [],
        "correqs": []
    },
    "02:256:122": {
        "name": "Topology",
        "description": "Introduction to point-set topology, including open and closed sets, continuity, and topological spaces.",
        "credits": 3,
        "prereqs": ["02:256:117"],
        "correqs": ["02:256:206"]
    },
    "02:256:206": {
        "name": "Topology Lab",
        "description": "Lab component for Topology covering visualizations and hands-on activities.",
        "credits": 1,
        "prereqs": [],
        "correqs": []
    }
}